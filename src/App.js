import React, { useEffect } from "react";
import { ethers } from 'ethers';
import Safe, { EthersAdapter, EthSignSignature, SafeFactory } from '@gnosis.pm/safe-core-sdk';
import { bufferToHex, ecrecover, pubToAddress } from 'ethereumjs-util'


const EIP712_DOMAIN_BEFORE_V130 = [
  {
    type: 'address',
    name: 'verifyingContract',
  },
]

export const EMPTY_DATA = '0x'

export const sameString = (str1, str2) => {
  if (!str1 || !str2) {
    return false
  }

  return str1.toLowerCase() === str2.toLowerCase()
}

const getEip712MessageTypes = (safeVersion) => {
  // const eip712WithChainId = semverSatisfies(safeVersion, '>=1.3.0')

  return {
    EIP712Domain: EIP712_DOMAIN_BEFORE_V130,
    // EIP712Domain: eip712WithChainId ? EIP712_DOMAIN : EIP712_DOMAIN_BEFORE_V130,
    SafeTx: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
      { type: 'bytes', name: 'data' },
      { type: 'uint8', name: 'operation' },
      { type: 'uint256', name: 'safeTxGas' },
      { type: 'uint256', name: 'baseGas' },
      { type: 'uint256', name: 'gasPrice' },
      { type: 'address', name: 'gasToken' },
      { type: 'address', name: 'refundReceiver' },
      { type: 'uint256', name: 'nonce' },
    ],
  }
}

export const isTxHashSignedWithPrefix = (txHash, signature, ownerAddress) => {
  let hasPrefix
  try {
    const rsvSig = {
      r: Buffer.from(signature.slice(2, 66), 'hex'),
      s: Buffer.from(signature.slice(66, 130), 'hex'),
      v: parseInt(signature.slice(130, 132), 16),
    }
    const recoveredData = ecrecover(Buffer.from(txHash.slice(2), 'hex'), rsvSig.v, rsvSig.r, rsvSig.s)
    const recoveredAddress = bufferToHex(pubToAddress(recoveredData))
    hasPrefix = !sameString(recoveredAddress, ownerAddress)
  } catch (e) {
    hasPrefix = true
  }
  return hasPrefix
}

const adjustV = (
  signingMethod,
  signature,
  safeTxHash,
  sender,
) => {
  const MIN_VALID_V_VALUE = 27
  let sigV = parseInt(signature.slice(-2), 16)

  if (signingMethod === 'eth_sign') {
    /* 
      Usually returned V (last 1 byte) is 27 or 28 (valid ethereum value)
      Metamask with ledger returns v = 01, this is not valid for ethereum
      In case V = 0 or 1 we add it to 27 or 28
      Adding 4 is required if signed message was prefixed with "\x19Ethereum Signed Message:\n32"
      Some wallets do that, some wallets don't, V > 30 is used by contracts to differentiate between prefixed and non-prefixed messages
      https://github.com/gnosis/safe-contracts/blob/main/contracts/GnosisSafe.sol#L292
    */
    if (sigV < MIN_VALID_V_VALUE) {
      sigV += MIN_VALID_V_VALUE
    }
    const adjusted = signature.slice(0, -2) + sigV.toString(16)
    const signatureHasPrefix = isTxHashSignedWithPrefix(safeTxHash, adjusted, sender)
    if (signatureHasPrefix) {
      sigV += 4
    }
  }

  if (signingMethod === 'eth_signTypedData') {
    // Metamask with ledger returns V=0/1 here too, we need to adjust it to be ethereum's valid value (27 or 28)
    if (sigV < MIN_VALID_V_VALUE) {
      sigV += MIN_VALID_V_VALUE
    }
  }

  return signature.slice(0, -2) + sigV.toString(16)
}

function App() {
  const handleClick = async () => {
    const web3Provider =
      "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    const owner1 = provider.getSigner(0);
    const accounts = await owner1.provider.listAccounts();
    window.signer = accounts[0];
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1,
    });
    const safeAddress = '0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc'
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x38d7ea4c68000",
      data: "0x",
    });
    // const typedData = {
    //   types: getEip712MessageTypes('1.2.0'),
    //   domain: {
    //     chainId: undefined,
    //     verifyingContract: safeAddress,
    //   },
    //   primaryType: 'SafeTx',
    //   message: {
    //     to: safeTransaction.data.to,
    //     value: safeTransaction.data.value,
    //     data: safeTransaction.data.data,
    //     operation: safeTransaction.data.operation,
    //     safeTxGas: safeTransaction.data.safeTxGas,
    //     baseGas: safeTransaction.data.baseGas,
    //     gasPrice: safeTransaction.data.gasPrice,
    //     gasToken: safeTransaction.data.gasToken,
    //     refundReceiver: safeTransaction.data.refundReceiver,
    //     nonce: Number(safeTransaction.data.nonce),
    //   },
    // }
    // const signature = await window.ethereum.request({
    //   method: 'eth_signTypedData_v3',
    //   params: [accounts[0], JSON.stringify(typedData)]
    // })
    // let sig = adjustV('eth_signTypedData', signature)
    // sig = sig.replace(EMPTY_DATA, '')
    // const tmp = new EthSignSignature(accounts[0], sig);
    // await safeTransaction.addSignature(tmp);
    console.log('safeTransaction', safeTransaction)
    const owner1Signature = await safeSdk.signTransaction(safeTransaction);
    window.sign = safeTransaction.signatures.get(accounts[0].toLowerCase()).data;
    // const safeSdk3 = await safeSdk.connect({ ethAdapter: ethAdapterOwner1, safeAddress })
    // const executeTxResponse = await safeSdk3.executeTransaction(safeTransaction)
    // await executeTxResponse.wait()
  };

  const handleClick2 = async () => {
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    const owner1 = provider.getSigner(0);
    const accounts = await owner1.provider.listAccounts();
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1,
    });
    const safeAddress = '0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc'
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x38d7ea4c68000",
      data: "0x",
    });
    // const typedData = {
    //   types: getEip712MessageTypes('1.2.0'),
    //   domain: {
    //     chainId: undefined,
    //     verifyingContract: safeAddress,
    //   },
    //   primaryType: 'SafeTx',
    //   message: {
    //     to: safeTransaction.data.to,
    //     value: safeTransaction.data.value,
    //     data: safeTransaction.data.data,
    //     operation: safeTransaction.data.operation,
    //     safeTxGas: safeTransaction.data.safeTxGas,
    //     baseGas: safeTransaction.data.baseGas,
    //     gasPrice: safeTransaction.data.gasPrice,
    //     gasToken: safeTransaction.data.gasToken,
    //     refundReceiver: safeTransaction.data.refundReceiver,
    //     nonce: Number(safeTransaction.data.nonce),
    //   },
    // }
    // const signature = await window.ethereum.request({
    //   method: 'eth_signTypedData_v3',
    //   params: [accounts[0], JSON.stringify(typedData)]
    // })
    // let sig = adjustV('eth_signTypedData', signature)
    // sig = sig.replace(EMPTY_DATA, '')
    // const tmp = new EthSignSignature(accounts[0], sig);
    const tmp1 = new EthSignSignature(window.signer, window.sign);
    // await safeTransaction.addSignature(tmp);
    await safeTransaction.addSignature(tmp1);
    const safeSdk3 = await safeSdk.connect({ ethAdapter: ethAdapterOwner1, safeAddress })
    const executeTxResponse = await safeSdk3.executeTransaction(safeTransaction)
    await executeTxResponse.wait()
  };

  const handleCreate = async () => {
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    const owner1 = provider.getSigner(0);
    const ethAdapter = new EthersAdapter({ ethers, signer: owner1 })
    const safeFactory = await SafeFactory.create({ ethAdapter })

    const owners = ['0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85', '0xfe28333b555829c0952f8bf9bf626f86ec4ab77f']
    const threshold = 2
    const safeAccountConfig = { owners, threshold }

    const safeSdk = await safeFactory.deploySafe(safeAccountConfig)
    const newSafeAddress = safeSdk.getAddress()
    console.log(newSafeAddress);
  };

  const handleOnChain1 = async () => {
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    const owner1 = provider.getSigner(0);
    const ethAdapterOwner2 = new EthersAdapter({ ethers, signer: owner1 })
    const safeAddress = '0xB023c11FbcBd0F8D02C85A7CF51A1eaB085e6D67'
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner2,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x1",
      data: "0x",
    });
    const safeSdk2 = await safeSdk.connect({ ethAdapter: ethAdapterOwner2, safeAddress })
    const txHash = await safeSdk2.getTransactionHash(safeTransaction)
    const approveTxResponse = await safeSdk2.approveTransactionHash(txHash)
    await approveTxResponse.wait()
  };

  const handleOnChain2 = async () => {
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    const owner1 = provider.getSigner(0);
    const ethAdapterOwner2 = new EthersAdapter({ ethers, signer: owner1 })
    const safeAddress = '0xB023c11FbcBd0F8D02C85A7CF51A1eaB085e6D67'
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner2,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x1",
      data: "0x",
    });
    const safeSdk2 = await safeSdk.connect({ ethAdapter: ethAdapterOwner2, safeAddress })
    const txHash = await safeSdk2.getTransactionHash(safeTransaction)
    const approveTxResponse = await safeSdk2.approveTransactionHash(txHash)
    await approveTxResponse.wait()
    const ethAdapterOwner3 = new EthersAdapter({ ethers, signer: owner1 })
    const safeSdk3 = await safeSdk2.connect({ ethAdapter: ethAdapterOwner3, safeAddress })
    const executeTxResponse = await safeSdk3.executeTransaction(safeTransaction)
    await executeTxResponse.wait()
  };

  useEffect(() => {
    window.ethereum.request({
      "method": "eth_requestAccounts",
      "params": []
    })
  }, [])

  return (
    <div className="App">
      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleClick}>off-chain 1</button>
        <button onClick={handleClick2}>off-chain 2</button>
      </div>
      <div>
        {/* <button onClick={handleOnChain1}>on-chain 1</button>
        <button onClick={handleOnChain2}>on-chain 2</button> */}
        <button onClick={handleCreate}>Create</button>
      </div>
    </div>
  );
}

export default App;
