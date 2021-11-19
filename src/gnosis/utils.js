import { BigNumber } from "@ethersproject/bignumber";
import { OperationType, } from "@gnosis.pm/safe-core-sdk-types";
import { bufferToHex, ecrecover, pubToAddress } from "ethereumjs-util";
import { ZERO_ADDRESS, SENTINEL_ADDRESS } from "./constants";
import EthSignSignature from "@gnosis.pm/safe-core-sdk/dist/src/utils/signatures/SafeSignature";
function estimateDataGasCosts(data) {
    const reducer = (accumulator, currentValue) => {
        if (currentValue === "0x") {
            return accumulator + 0;
        }
        if (currentValue === "00") {
            return accumulator + 4;
        }
        return accumulator + 16;
    };
    return data.match(/.{2}/g).reduce(reducer, 0);
}
export function sameString(str1, str2) {
    return str1.toLowerCase() === str2.toLowerCase();
}
function isZeroAddress(address) {
    return address === ZERO_ADDRESS;
}
function isSentinelAddress(address) {
    return address === SENTINEL_ADDRESS;
}
export function isRestrictedAddress(address) {
    return isZeroAddress(address) || isSentinelAddress(address);
}
export async function estimateTxGas(safeAddress, safeContract, provider, to, valueInWei, data, operation) {
    let txGasEstimation = 0;
    const estimateData = safeContract.interface.encodeFunctionData("requiredTxGas", [to, valueInWei, data, operation]);
    try {
        const estimateResponse = (await provider.estimateGas({
            to: safeAddress,
            from: safeAddress,
            data: estimateData,
        })).toString();
        txGasEstimation =
            BigNumber.from("0x" + estimateResponse.substring(138)).toNumber() + 10000;
    }
    catch (error) { }
    if (txGasEstimation > 0) {
        const dataGasEstimation = estimateDataGasCosts(estimateData);
        let additionalGas = 10000;
        for (let i = 0; i < 10; i++) {
            try {
                const estimateResponse = await provider.call({
                    to: safeAddress,
                    from: safeAddress,
                    data: estimateData,
                    gasPrice: 0,
                    gasLimit: txGasEstimation + dataGasEstimation + additionalGas,
                });
                if (estimateResponse !== "0x") {
                    break;
                }
            }
            catch (error) { }
            txGasEstimation += additionalGas;
            additionalGas *= 2;
        }
        return txGasEstimation + additionalGas;
    }
    try {
        const estimateGas = await provider.estimateGas({
            to,
            from: safeAddress,
            value: valueInWei,
            data,
        });
        return estimateGas.toNumber();
    }
    catch (error) {
        if (operation === OperationType.DelegateCall) {
            return 0;
        }
        return Promise.reject(error);
    }
}
export async function standardizeSafeTransactionData(safeAddress, safeContract, provider, tx) {
    var _a, _b, _c, _d, _e;
    const standardizedTxs = {
        to: tx.to,
        value: tx.value,
        data: tx.data,
        operation: (_a = tx.operation) !== null && _a !== void 0 ? _a : OperationType.Call,
        baseGas: (_b = tx.baseGas) !== null && _b !== void 0 ? _b : 0,
        gasPrice: (_c = tx.gasPrice) !== null && _c !== void 0 ? _c : 0,
        gasToken: tx.gasToken || ZERO_ADDRESS,
        refundReceiver: tx.refundReceiver || ZERO_ADDRESS,
        nonce: (_d = tx.nonce) !== null && _d !== void 0 ? _d : (await safeContract.nonce()).toNumber(),
    };
    const safeTxGas = (_e = tx.safeTxGas) !== null && _e !== void 0 ? _e : (await estimateTxGas(safeAddress, safeContract, provider, standardizedTxs.to, standardizedTxs.value, standardizedTxs.data, standardizedTxs.operation));
    return {
        ...standardizedTxs,
        safeTxGas,
    };
}
export function generatePreValidatedSignature(ownerAddress) {
    const signature = "0x000000000000000000000000" +
        ownerAddress.slice(2) +
        "0000000000000000000000000000000000000000000000000000000000000000" +
        "01";
    return new EthSignSignature(ownerAddress, signature);
}
export function isTxHashSignedWithPrefix(txHash, signature, ownerAddress) {
    let hasPrefix;
    try {
        const rsvSig = {
            r: Buffer.from(signature.slice(2, 66), "hex"),
            s: Buffer.from(signature.slice(66, 130), "hex"),
            v: parseInt(signature.slice(130, 132), 16),
        };
        const recoveredData = ecrecover(Buffer.from(txHash.slice(2), "hex"), rsvSig.v, rsvSig.r, rsvSig.s);
        const recoveredAddress = bufferToHex(pubToAddress(recoveredData));
        hasPrefix = !sameString(recoveredAddress, ownerAddress);
    }
    catch (e) {
        hasPrefix = true;
    }
    return hasPrefix;
}
export function adjustVInSignature(signature, hasPrefix) {
    const V_VALUES = [0, 1, 27, 28];
    const MIN_VALID_V_VALUE = 27;
    let signatureV = parseInt(signature.slice(-2), 16);
    if (!V_VALUES.includes(signatureV)) {
        throw new Error("Invalid signature");
    }
    if (signatureV < MIN_VALID_V_VALUE) {
        signatureV += MIN_VALID_V_VALUE;
    }
    if (hasPrefix) {
        signatureV += 4;
    }
    signature = signature.slice(0, -2) + signatureV.toString(16);
    return signature;
}
export async function generateSignature(provider, hash) {
    const signer = await provider.getSigner(0);
    const signerAddress = await signer.getAddress();
    let signature = await provider.send("personal_sign", [hash, signerAddress]);
    const hasPrefix = isTxHashSignedWithPrefix(hash, signature, signerAddress);
    signature = adjustVInSignature(signature, hasPrefix);
    return new EthSignSignature(signerAddress, signature);
}
export async function estimateGasForTransactionExecution(safeContract, from, tx) {
    try {
        const gas = await safeContract.estimateGas.execTransaction(tx.data.to, tx.data.value, tx.data.data, tx.data.operation, tx.data.safeTxGas, tx.data.baseGas, tx.data.gasPrice, tx.data.gasToken, tx.data.refundReceiver, tx.encodedSignatures(), { from });
        return gas.toNumber();
    }
    catch (error) {
        return Promise.reject(error);
    }
}
export function toTxResult(promiEvent, options) {
    return new Promise((resolve, reject) => promiEvent
        .once("transactionHash", (hash) => resolve({ hash, promiEvent, options }))
        .catch(reject));
}
