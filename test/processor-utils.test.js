/* eslint-disable global-require */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

const fs = require('fs');
const path = require('path');
const ethers = require('ethers');
const { expect } = require('chai');
const { Scalar } = require('ffjavascript');
const { processorUtils } = require('../index');
const { Constants } = require('../index');
const { pathTestVectors } = require('./helpers/test-utils');

describe('Processor utils', () => {
    let testVectors;
    let testVectorsEffGasPrice;

    before(async () => {
        testVectors = JSON.parse(fs.readFileSync(path.join(pathTestVectors, 'zkevm-db/state-transition.json')));
        testVectorsEffGasPrice = JSON.parse(fs.readFileSync(path.join(pathTestVectors, 'effective-gas-price/effective-gas-price.json')));
    });

    /*it('Check encode and decode transactions', async () => {
        for (let i = 0; i < testVectors.length; i++) {
            const {
                genesis,
                txs,
            } = testVectors[i];
  
            const walletMap = {};
  
            // load wallets
            for (let j = 0; j < genesis.length; j++) {
                const {
                    address, pvtKey,
                } = genesis[j];
                const newWallet = new ethers.Wallet(pvtKey);
                expect(address).to.be.equal(newWallet.address);
                walletMap[address] = newWallet;
            }
  
            /*
             * build, sign transaction and generate rawTxs
             * rawTxs would be the calldata inserted in the contract
             */
    /* for (let j = 0; j < txs.length; j++) {
         const txData = txs[j];
  
         if (txData.type === Constants.TX_CHANGE_L2_BLOCK) {
             continue;
         }
  
         const tx = {
             to: txData.to,
             nonce: txData.nonce,
             value: ethers.utils.parseUnits(txData.value, 'wei'),
             gasLimit: txData.gasLimit,
             gasPrice: ethers.utils.parseUnits(txData.gasPrice, 'wei'),
             chainId: txData.chainId,
             data: txData.data || '0x',
         };
  
         if (!ethers.utils.isAddress(tx.to) || !ethers.utils.isAddress(txData.from)) {
             expect(txData.customRawTx).to.equal(undefined);
             continue;
         }
  
         try {
             let customRawTx;
  
             if (tx.chainId === 0) {
                 const signData = ethers.utils.RLP.encode([
                     processorUtils.toHexStringRlp(Scalar.e(tx.nonce)),
                     processorUtils.toHexStringRlp(tx.gasPrice),
                     processorUtils.toHexStringRlp(tx.gasLimit),
                     processorUtils.addressToHexStringRlp(tx.to),
                     processorUtils.toHexStringRlp(tx.value),
                     processorUtils.toHexStringRlp(tx.data),
                     processorUtils.toHexStringRlp(tx.chainId),
                     '0x',
                     '0x',
                 ]);
                 const digest = ethers.utils.keccak256(signData);
                 const signingKey = new ethers.utils.SigningKey(walletMap[txData.from].privateKey);
                 const signature = signingKey.signDigest(digest);
                 const r = signature.r.slice(2).padStart(64, '0'); // 32 bytes
                 const s = signature.s.slice(2).padStart(64, '0'); // 32 bytes
                 const v = (signature.v).toString(16).padStart(2, '0'); // 1 bytes
                 if (typeof tx.effectivePercentage === 'undefined') {
                     tx.effectivePercentage = 'ff';
                 }
                 customRawTx = signData.concat(r).concat(s).concat(v).concat(tx.effectivePercentage);
             } else {
                 const rawTxEthers = await walletMap[txData.from].signTransaction(tx);
                 customRawTx = processorUtils.rawTxToCustomRawTx(rawTxEthers);
  
                 const reconstructedEthers = processorUtils.customRawTxToRawTx(customRawTx);
                 expect(rawTxEthers).to.equal(reconstructedEthers);
             }
             expect(customRawTx).to.equal(txData.customRawTx);
  
             // Test decode raw tx prover method
             const { txDecoded, rlpSignData } = processorUtils.decodeCustomRawTxProverMethod(customRawTx);
             const signData = ethers.utils.RLP.encode([
                 processorUtils.toHexStringRlp(Scalar.e(tx.nonce)),
                 processorUtils.toHexStringRlp(tx.gasPrice),
                 processorUtils.toHexStringRlp(tx.gasLimit),
                 processorUtils.toHexStringRlp(tx.to),
                 processorUtils.toHexStringRlp(tx.value),
                 processorUtils.toHexStringRlp(tx.data),
                 processorUtils.toHexStringRlp(tx.chainId),
                 '0x',
                 '0x',
             ]);
             expect(rlpSignData).to.equal(signData);
  
             const txParams = Object.keys(txDecoded);
             txParams.forEach((key) => {
                 if (txDecoded[key] === '0x' && key !== 'data') {
                     txDecoded[key] = '0x00';
                 }
             });
             expect(Number(txDecoded.nonce)).to.equal(tx.nonce);
             expect(txDecoded.gasPrice).to.equal(ethers.utils.hexlify(tx.gasPrice));
             expect(txDecoded.gasLimit).to.equal(ethers.utils.hexlify(tx.gasLimit));
             expect(ethers.utils.hexlify(txDecoded.to)).to.equal(ethers.utils.hexlify(tx.to));
             expect(txDecoded.value).to.equal(ethers.utils.hexlify(tx.value));
             expect(Number(txDecoded.chainID)).to.equal(tx.chainId);
         } catch (error) {
             expect(txData.customRawTx).to.equal(undefined);
         }
     }
  }
  });
  
  it('toHexStringRlp', async () => {
  const testHexStringRLP = [
     [0, '0x'],
     ['0x', '0x'],
     ['0x00', '0x00'],
     ['0x0000', '0x0000'],
     ['0x1234', '0x1234'],
     [Scalar.e('0x1234'), '0x1234'],
     [1234n, '0x04d2'],
  ];
  
  for (let i = 0; i < testHexStringRLP.length; i++) {
     const input = testHexStringRLP[i][0];
     const expectedOut = testHexStringRLP[i][1];
  
     const out = processorUtils.toHexStringRlp(input);
  
     expect(out).to.be.equal(expectedOut);
  }
  });
  
  it('addressToHexStringRlp', async () => {
  const testHexStringRLP = [
     [undefined, '0x'],
     ['0x', '0x'],
     ['0x00', '0x0000000000000000000000000000000000000000'],
     ['0x0000', '0x0000000000000000000000000000000000000000'],
     [0, '0x0000000000000000000000000000000000000000'],
     ['0x01', '0x0000000000000000000000000000000000000001'],
     [1, '0x0000000000000000000000000000000000000001'],
     ['0x1234', '0x0000000000000000000000000000000000001234'],
     [Scalar.e('0x1234'), '0x0000000000000000000000000000000000001234'],
     [1234n, '0x00000000000000000000000000000000000004d2'],
  ];
  
  for (let i = 0; i < testHexStringRLP.length; i++) {
     const input = testHexStringRLP[i][0];
     const expectedOut = testHexStringRLP[i][1];
  
     const out = processorUtils.addressToHexStringRlp(input);
     expect(out).to.be.equal(expectedOut);
  }
  });
  
  it('computeEffectiveGasPrice', async () => {
  for (let i = 0; i < testVectorsEffGasPrice.length; i++) {
     const { gasPrice, effectivePercentage, expectedOutput } = testVectorsEffGasPrice[i];
  
     const computedOutput = `0x${processorUtils.computeEffectiveGasPrice(gasPrice, effectivePercentage).toString(16)}`;
     expect(computedOutput).to.be.equal(expectedOutput);
  }
  });
  
  it('encodedStringToArray', async () => {
  for (let i = 0; i < testVectors.length; i++) {
     const {
         batchL2Data,
         txs,
     } = testVectors[i];
  
     const arrayTxs = processorUtils.encodedStringToArray(batchL2Data);
  
     expect(arrayTxs.length).to.be.equal(txs.length);
  
     for (let j = 0; j < arrayTxs.length; j++) {
         expect(arrayTxs[j]).to.be.equal(txs[j].customRawTx);
     }
  }
  });
  
  it('computeL2TxHash', async () => {
  const txs = require('./helpers/test-vectors/l2-tx-hash/txs.json');
  for (let i = 0; i < txs.length; i++) {
     const tx = txs[i];
     try {
         const { txHash, dataEncoded } = await processorUtils.computeL2TxHash(tx, true);
         expect(txHash).to.be.equal(tx.l2TxHash);
         expect(dataEncoded).to.be.equal(tx.encoded);
     } catch (e) {
         if (e.message !== 'Invalid hex string') {
             throw e;
         }
         expect(tx.l2TxHash).to.be.equal('failed');
     }
  }
  });
  
  it('rawTxToCustomRawTx & customRawTxToRawTx', async () => {
  // preEIP155 & Legacy Etheruem transactions
  const testVector = [
     {
         customRawTx: '0xea80843b9aca00830186a0941275fbb540c8efc58b812ba83b0d0b8b9917ae98808464fbb77c8203e88080fb5252bea10b359c0c5998b4d8185bb02e3503112e930f578dfb94f8e929cf4b2501bfdc00a066681e3b5ee9427ca97dfb8de68d570d8c36d5e3f8e9d6acfe4b1b01',
     },
     {
         customRawTx: '0xe580843b9aca00830186a0941275fbb540c8efc58b812ba83b0d0b8b9917ae98808464fbb77c6b39bdc5f8e458aba689f2a1ff8c543a94e4817bda40f3fe34080c4ab26c1e3c2fc2cda93bc32f0a79940501fd505dcf48d94abfde932ebf1417f502cb0d9de81b10',
     },
  ];
  
  for (let i = 0; i < testVector.length; i++) {
     const { customRawTx } = testVector[i];
     const effectivePercentage = customRawTx.slice(-2);
  
     // compute rawTx
     const rawTx = await processorUtils.customRawTxToRawTx(customRawTx);
     // recompute customRawTx
     const computedCustomRawTx = processorUtils.rawTxToCustomRawTx(rawTx, effectivePercentage);
     expect(computedCustomRawTx).to.be.equal(customRawTx);
  }
  }); */

    /*it('Test rawTx', async () => {
        const ACC_ADMIN_L2_PK = "0x5cbfb3ce514f6c3722fccb35af784ff78001d62ee86438a26daa92dbc0ca91e6";
        const wallet = new ethers.Wallet(ACC_ADMIN_L2_PK);
  
        const initialNonce = 0;
        const txNumber = 3;
        let rawTxEthers;
        let txString="";
  
        for(i= initialNonce; i < initialNonce + txNumber; i++){
            const tx = {
                nonce: i,
                gasPrice: ethers.utils.parseUnits('2000', 'gwei'),
                gasLimit: 6000000,
                to: "0xD1bDc89154272Fb5A5794797e36750C1F0aF9859",
                value: ethers.utils.parseUnits('200', 'ether'),
                data: "0x",
                chainId: 1001
            }
  
            rawTxEthers = await wallet.signTransaction(tx);
            console.log(rawTxEthers)
            customRawTx = processorUtils.rawTxToCustomRawTx(rawTxEthers);
            
            txString = txString.concat(customRawTx.slice(2));
        }
  
        txString = "0x" + txString;
        console.log("customRawTx: ", txString);
  
        let txs = {"TXs" : txString, "signer": ACC_ADMIN_L2_PK};
        let txsStringify = JSON.stringify(txs);
        
        fs.writeFileSync("/Users/gimer/Desktop/Settle/Projects/ResearchV2/scripts/tx_approve.json", txsStringify)
    }); */

    // Send an approve tx in L2 --> Update Nonce, Bridge and Weth contract addresses.
    const ACC_ADMIN_L2_PK = "0x5cbfb3ce514f6c3722fccb35af784ff78001d62ee86438a26daa92dbc0ca91e6";
    const ACC_USER_PK = "0x6ec659638309dd9b18ded7cab5a3c70b0ff30ae72aa3e6440ea3d79ef375933c";
    const ACC_USER_ADDRESS = "0x39dae6a77a5165598aeb84cae96aea0a2215bca8";
    const BRIDGE_ADDRESS = "0xa287181Fdb33BF557705fDcb40510fb8A8405b5a";
    const WETH_CONTRACT = "0xf0775e18fd0f41bf8cea2c85fd4cbbb9dc6b7ca2";

    it('Test rawTx', async () => {
        const wallet = new ethers.Wallet(ACC_USER_PK);

        const initialNonce = 0;

        const ABI = ["function approve(address spender,uint256 amount)"]
        const valueHex = new ethers.utils.Interface(ABI);

        const dataTx = valueHex.encodeFunctionData("approve", [
            BRIDGE_ADDRESS,
            ethers.utils.parseEther("4.0")
        ]);

        const tx = {
            nonce: initialNonce,
            to: WETH_CONTRACT,
            from: wallet.address,
            gasLimit: 6000000,
            data: dataTx,
            chainId: 1001,
        };

        console.log("tx", tx)

        const rawTxEthers = await wallet.signTransaction(tx);
        console.log("rawTxEthers: ", rawTxEthers)
        const customRawTx = processorUtils.rawTxToCustomRawTx(rawTxEthers);

        console.log("customRawTx: ", customRawTx);

        let txs = { "TXs": customRawTx, "signerL1": ACC_ADMIN_L2_PK, "signerL2": ACC_USER_PK, "WETH": WETH_CONTRACT };
        let txsStringify = JSON.stringify(txs);

        fs.writeFileSync("../../test/tx_approve.json", txsStringify)
    });

    /*it('Test rawTx', async () => {
         const wallet = new ethers.Wallet(ACC_USER_PK);
   
         const initialNonce = 2;
         
         const ABI = ["function bridgeAsset(uint32,address,uint256,address,bool,bytes)"]
         const valueHex = new ethers.utils.Interface(ABI);
   
         const dataTx = valueHex.encodeFunctionData("bridgeAsset", [
             0,
             ACC_USER_ADDRESS,
             ethers.utils.parseEther("1.0"),
             WETH_CONTRACT,
             true,
             "0x",
         ]);
   
         const tx = {
                 nonce: initialNonce,
                 to: BRIDGE_ADDRESS,
                 from: wallet.address,
                 gasLimit: 6000000,
                 data: dataTx,
                 chainId: 1001
         }
  
         const rawTxEthers = await wallet.signTransaction(tx);
         const customRawTx = processorUtils.rawTxToCustomRawTx(rawTxEthers);
             
         console.log("customRawTx: ", customRawTx);
   
         let txs = {"TXs" : customRawTx, "signerL1": ACC_ADMIN_L2_PK, "signerL2": ACC_USER_PK, "WETH": WETH_CONTRACT};
         let txsStringify = JSON.stringify(txs);
         
         fs.writeFileSync("/Users/gimer/Desktop/Settle/Projects/ResearchV2/scripts/tx_bridge.json", txsStringify)
     }); */
});
