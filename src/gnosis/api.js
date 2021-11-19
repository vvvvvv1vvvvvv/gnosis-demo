import axios from "axios";
import { toChecksumAddress } from "web3-utils";
const host = "https://safe-transaction.gnosis.io/api/v1";
const HOST_MAP = {
    '1': "https://safe-transaction.gnosis.io/api/v1",
    '137': 'https://safe-transaction.polygon.gnosis.io/api/v1',
    '56': 'https://safe-transaction.bsc.gnosis.io/api/v1',
    '100': 'https://safe-transaction.xdai.gnosis.io/api/v1'
};
export default class RequestProvider {
    constructor(networkId) {
        if (!(networkId in HOST_MAP)) {
            throw new Error('Wrong networkId');
        }
        this.host = HOST_MAP[networkId];
        this.request = axios.create({
            baseURL: this.host
        });
        this.request.interceptors.response.use((response) => {
            return response.data;
        });
    }
    getPendingTransactions(safeAddress, nonce) {
        return this.request.get(`/safes/${safeAddress}/multisig-transactions/`, {
            params: {
                executed: false,
                nonce__gte: nonce,
            },
        });
    }
    postTransactions(safeAddres, data) {
        return this.request.post(`/safes/${toChecksumAddress(safeAddres)}/multisig-transactions/`, data);
    }
    getSafeInfo(safeAddress) {
        return this.request.get(`/safes/${safeAddress}/`);
    }
    confirmTransaction(hash, data) {
        return this.request.post(`/multisig-transactions/${hash}/confirmations/`, data);
    }
}
