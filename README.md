# <h3> CHILLL PRINCESS</h3> 
The princess NFT can be minted by only holders of chill frogs nft on a one-to-one basis.
Inorder to whitelist the eligible addresses, merkle list whitelisting was used. 
The holders of chill-frogs nft and the number of chill frogs they own was generated off-chain. ethers.js was used in querying and getting data from the blockchain
Each address and their chill balance was hashed using solidity keccak256 algorithm to get the leaves for the merkle tree.
The root of the merkle tree was stored on the smart contract. When an eligible address interacts with the dapp frontend,
the frontend interacts with an api that supplies the proof which is then used to verify the address on the smart contract.

The contract was developed using hardhat and the solidity file is located in <code>contracts</code>
The nft metadata is stored on ipfs.
The princess contract was deployed on ethereum mainnet https://etherscan.io/token/0x7F5d260de88Acfb9f9A181431e461C5B5409d91E

chill frogs nft - https://etherscan.io/address/0xa3b7CEe4e082183E69a03Fc03476f28b12c545A7

