import React, { useEffect } from "react";
import { ethers } from 'ethers';
import Safe, { EthersAdapter, EthSignSignature } from '@gnosis.pm/safe-core-sdk';

function App() {
  const handleClick = async () => {
    const web3Provider =
      "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    const owner1 = provider.getSigner(0);
    const accounts = await owner1.provider.listAccounts();
    console.log('>>> accounts', accounts)
    window.signer = accounts[0];
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1,
    });
    const safeAddress = '0xB023c11FbcBd0F8D02C85A7CF51A1eaB085e6D67'
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    console.log(2)
    const safeTransaction = await safeSdk.createTransaction({
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x1",
      data: "0x",
    });
    console.log(3);
    const owner1Signature = await safeSdk.signTransaction(safeTransaction);
    window.sign = safeTransaction.signatures.get(accounts[0].toLowerCase()).data;
    // const safeSdk3 = await safeSdk.connect({ ethAdapter: ethAdapterOwner1, safeAddress })
    // const executeTxResponse = await safeSdk3.executeTransaction(safeTransaction)
    // await executeTxResponse.wait()
  };

  const handleClick2 = async () => {
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    const owner1 = provider.getSigner(0);
    console.log(owner1._address)
    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1,
    });
    const safeAddress = '0xB023c11FbcBd0F8D02C85A7CF51A1eaB085e6D67'
    const safeSdk = await Safe.create({
      ethAdapter: ethAdapterOwner1,
      safeAddress,
    });
    const safeTransaction = await safeSdk.createTransaction({
      to: "0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85",
      value: "0x1",
      data: "0x",
    });
    console.log({
      signer: window.signer,
      data: window.sign,
    })
    await safeSdk.signTransaction(safeTransaction);
    const sig = new EthSignSignature(window.signer, window.sign);
    console.log('>>> sig', sig);
    await safeTransaction.addSignature(sig);
    console.log('>>>safeTransaction', safeTransaction.signatures)
    console.log(safeTransaction);
    const safeSdk3 = await safeSdk.connect({ ethAdapter: ethAdapterOwner1, safeAddress })
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
      <button onClick={handleClick}>test</button>
      <button onClick={handleClick2}>test2</button>
    </div>
  );
}

export default App;
