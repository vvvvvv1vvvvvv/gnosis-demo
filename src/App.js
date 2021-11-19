import React, { useEffect, useState } from "react";
import { ethers, Contract } from "ethers";
import { Table, Button, Modal } from "antd";
import Safe, {
  EthersAdapter,
  EthSignSignature,
  SafeFactory
} from "@gnosis.pm/safe-core-sdk";
import { intToHex } from "ethereumjs-util";
import {
  getSafeSingletonDeployment,
  getProxyFactoryDeployment
} from '@gnosis.pm/safe-deployments';
import MySafe from './gnosis'
import "antd/dist/antd.min.css";

const { Column } = Table;

console.log(getProxyFactoryDeployment({ version: '1.1.1' }))

export const EMPTY_DATA = "0x";

export const sameString = (str1, str2) => {
  if (!str1 || !str2) {
    return false;
  }

  return str1.toLowerCase() === str2.toLowerCase();
};

const provider = new ethers.providers.Web3Provider(
  window.web3.currentProvider
);
const safe = new MySafe('0xC6691AC88df8f4fdC20c1d9170dc76e851Df1541', '1.1.1', provider)

function App() {
  const [currentAddress, setCurrentAddress] = useState(null);
  const [txs, setTxs] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [txDetail, setTxDetail] = useState("");
  const [safeInfo, setSafeInfo] = useState(null);

  const handleClick = async () => {
    const tx = {
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x38d7ea4c68000",
      data: "0x",
    }
    const safeTransaction = await safe.buildTransaction(tx);
    const hash = await safe.getTransactionHash(safeTransaction);
    const sig = await safe.signTransactionHash(hash);
    safeTransaction.addSignature(sig);

    await safe.postTransaction(safeTransaction, hash)
    init();
  };

  const handleConfirm = async (tx) => {
    const safeTransaction = await safe.buildTransaction({
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
    await safe.confirmTransaction(safeTransaction);
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
    const safeTransaction = await safe.buildTransaction({
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
    await safe.executeTransaction(safeTransaction);
  };

  const init = async () => {
    const res = await window.ethereum.request({
      method: "eth_requestAccounts",
      params: [],
    });
    window.ethereum.on('accountsChanged', init);
    const { results } = await safe.getPendingTransactions();
    const safeInfo = await safe.getSafeInfo();
    setSafeInfo(safeInfo)
    setCurrentAddress(res[0]);
    setTxs(results);
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
