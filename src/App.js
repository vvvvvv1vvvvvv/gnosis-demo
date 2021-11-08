import React, { useEffect, useState } from "react";
import { toChecksumAddress } from "web3-utils";
import axios from "axios";
import { ethers } from "ethers";
import { Table, Button, Modal } from "antd";
import Safe, {
  EthersAdapter,
  EthSignSignature,
} from "@gnosis.pm/safe-core-sdk";
import { intToHex } from "ethereumjs-util";
import "antd/dist/antd.min.css";

const { Column } = Table;

export const EMPTY_DATA = "0x";

export const sameString = (str1, str2) => {
  if (!str1 || !str2) {
    return false;
  }

  return str1.toLowerCase() === str2.toLowerCase();
};

function App() {
  const [currentAddress, setCurrentAddress] = useState(null);
  const [txs, setTxs] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [txDetail, setTxDetail] = useState("");
  const [safeInfo, setSafeInfo] = useState(null);

  const postTransaction = (address, data) => {
    return axios.post(
      `https://safe-transaction.gnosis.io/api/v1/safes/${toChecksumAddress(
        "0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc"
      )}/multisig-transactions/`,
      data
    );
  };

  const confirmTransaction = (hash, data) => {
    return axios.post(
      `https://safe-transaction.gnosis.io/api/v1/multisig-transactions/${hash}/confirmations/`,
      data
    );
  };

  const getTransactions = () => {
    return axios.get(
      `https://safe-transaction.gnosis.io/api/v1/safes/0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc/multisig-transactions/`
    );
  };

  const getSafeInfo = () => {
    return axios.get(
      "https://safe-transaction.gnosis.io/api/v1/safes/0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc/"
    );
  };

  const handleClick = async () => {
    const provider = new ethers.providers.Web3Provider(
      window.web3.currentProvider
    );
    const owner1 = provider.getSigner(0);
    const accounts = await owner1.provider.listAccounts();
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1,
    });
    const safeAddress = "0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc";
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x38d7ea4c68000",
      data: "0x",
    });
    await safeSdk.signTransaction(safeTransaction);
    const hash = await safeSdk.getTransactionHash(safeTransaction);
    await postTransaction(safeAddress, {
      safe: toChecksumAddress(safeAddress),
      to: toChecksumAddress(safeTransaction.data.to),
      value: Number(safeTransaction.data.value),
      data: safeTransaction.data.data,
      operation: safeTransaction.data.operation,
      gasToken: safeTransaction.data.gasToken,
      safeTxGas: safeTransaction.data.safeTxGas,
      baseGas: safeTransaction.data.baseGas,
      gasPrice: safeTransaction.data.gasPrice,
      refundReceiver: safeTransaction.data.refundReceiver,
      nonce: safeTransaction.data.nonce,
      contractTransactionHash: hash,
      sender: toChecksumAddress(accounts[0]),
      signature: safeTransaction.signatures.get(
        accounts[0].toLowerCase()
      ).data,
    });
    init();
  };

  const handleConfirm = async (tx) => {
    const provider = new ethers.providers.Web3Provider(
      window.web3.currentProvider
    );
    const owner1 = provider.getSigner(0);
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1,
    });
    const safeAddress = "0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc";
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      gasPrice: tx.gasPrice,
      gasToken: tx.gasToken,
      nonce: tx.nonce,
      refundReceiver: tx.refundReceiver,
      to: tx.to,
      value: intToHex(Number(tx.value)),
      data: tx.data || "0x",
      safeTxGas: tx.safeTxGas,
      baseGas: tx.baseGas,
      operation: tx.operation,
    });
    await safeSdk.signTransaction(safeTransaction);
    const hash = await safeSdk.getTransactionHash(safeTransaction);
    const signature = safeTransaction.signatures.get(
      currentAddress.toLowerCase()
    ).data;
    await confirmTransaction(hash, { signature });
    init();
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleViewDetail = (tx) => {
    setTxDetail(
      JSON.stringify(
        {
          gasPrice: tx.gasPrice,
          gasToken: tx.gasToken,
          nonce: tx.nonce,
          refundReceiver: tx.refundReceiver,
          to: tx.to,
          value: intToHex(Number(tx.value)),
          data: tx.data || "0x",
          safeTxGas: tx.safeTxGas,
          baseGas: tx.baseGas,
          operation: tx.operation,
        },
        null,
        2
      )
    );
    setIsModalVisible(true);
  };

  const handleExecute = async (tx) => {
    const provider = new ethers.providers.Web3Provider(
      window.web3.currentProvider
    );
    const owner1 = provider.getSigner(0);
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1,
    });
    const safeAddress = "0x9f18623f08eeBEcAEa7A404C9A6Cc451994fA4Dc";
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      gasPrice: tx.gasPrice,
      gasToken: tx.gasToken,
      nonce: tx.nonce,
      refundReceiver: tx.refundReceiver,
      to: tx.to,
      value: intToHex(Number(tx.value)),
      data: tx.data || "0x",
      safeTxGas: tx.safeTxGas,
      baseGas: tx.baseGas,
      operation: tx.operation,
    });
    if (tx.confirmations) {
      await Promise.all(
        tx.confirmations.map((confirm) => {
          const sig = new EthSignSignature(confirm.owner, confirm.signature);
          return safeTransaction.addSignature(sig);
        })
      );
    }
    const safeSdk3 = await safeSdk.connect({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    await safeSdk3.executeTransaction(safeTransaction);
  };

  const init = async () => {
    const res = await window.ethereum.request({
      method: "eth_requestAccounts",
      params: [],
    });
    window.ethereum.on('accountsChanged', init);
    const info = await getSafeInfo();
    const { data } = await getTransactions();
    setCurrentAddress(res[0]);
    setSafeInfo(info.data);
    setTxs(data.results);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="App">
      <div style={{ marginBottom: "10px" }}>
        <Button type="primary" onClick={handleClick}>Create Transaction</Button>
      </div>
      <Table dataSource={txs}>
        <Column title="safeTxHash" dataIndex="safeTxHash" key="safeTxHash" />
        <Column
          title="submissionDate"
          dataIndex="submissionDate"
          key="submissionDate"
        />
        <Column
          title="confirmations"
          dataIndex="confirmations"
          key="confirmations"
          render={(confirmations) => {
            return confirmations.map((confirm) => <p>{confirm.owner}</p>);
          }}
        />
        <Column
          title="operation"
          render={(row) => {
            return (
              <>
                <Button type="link" onClick={() => handleViewDetail(row)}>
                  View Detail
                </Button>
                {!row.confirmations.find(
                  (confirm) =>
                    confirm.owner.toLowerCase() === currentAddress.toLowerCase()
                ) && (
                  <Button type="primary" onClick={() => handleConfirm(row)}>
                    Confirm
                  </Button>
                )}
                {row.confirmations.length >= safeInfo.threshold &&
                  !row.isExecuted && (
                    <Button type="link" onClick={() => handleExecute(row)}>
                      Execute
                    </Button>
                  )}
              </>
            );
          }}
        />
      </Table>
      <Modal
        title="Basic Modal"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <pre>{txDetail}</pre>
      </Modal>
    </div>
  );
}

export default App;
