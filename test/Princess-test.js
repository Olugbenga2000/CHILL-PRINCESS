const { expect } = require("chai");
const { ethers } = require("hardhat");
const  keccak256  = require('keccak256')
const {MerkleTree} = require('merkletreejs')
const addressDict = require('../scripts/addressdict.json')
function HashWhiteListToken(address, allowance){
    return Buffer.from(hre.ethers.utils.solidityKeccak256(
        ['address', 'string'],[address, allowance]).slice(2),'hex'
    )
}

describe("princess Nft", () => {
    let princessNft, addr1, addr2,owner,uri;

    beforeEach(async()=>{
        uri = 'ipfs://QmcdnnAJmMMEYxwsh28eQh7st1oEbri8jEc1Vu7g3Puhq5/';
        [owner,addr1,addr2,_] = await ethers.getSigners();
        let princessNftContract = await ethers.getContractFactory('Princess');
        princessNft =  await princessNftContract.deploy(uri,owner.address);
        await princessNft.deployed();
    });

    describe('set the state variables correctly', () => {
        it('should initialize state variables correctly', async ()=>{
        expect(await princessNft.owner()).to.equal(owner.address);
        expect(await princessNft.MAX_SUPPLY()).to.equal(6000)
        expect(await princessNft.MAX_PER_TX()).to.equal(20)
        expect(await princessNft.totalSupply()).to.equal(0)
        expect(await princessNft.whitelistMerkleRoot()).to.equal('0xb54ab4fffb30f62f70e6f0e82b12b3aa53fb00d77b21c1bdc4dde59cb9db3b45')
        }) 
    })

    describe('only owner functions', () =>{
        it('should pause if owner', async() =>{
          await princessNft.pause()  
            expect(await princessNft.paused()).to.equal(true)
            await expect(princessNft.mint(2,'3',[])).to.be.revertedWith("Pausable: paused");
        });

         it('only owner can set another owner', async() =>{
            await expect(princessNft.connect(addr1).transferOwnership(addr2.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await princessNft.transferOwnership('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
            expect(await princessNft.owner()).to.equal(addr1.address);

        });

        it('should not pause if not owner', async() =>{ 
           await expect(princessNft.connect(addr1).pause()).to.be.revertedWith("Ownable: caller is not the owner");
           await expect(princessNft.connect(addr2).pause()).to.be.revertedWith("Ownable: caller is not the owner");
           expect(await princessNft.paused()).to.equal(false) 
        })
         it('should unpause if owner', async() =>{
          await princessNft.pause()  
             await princessNft.unpause()
            expect(await princessNft.paused()).to.equal(false) 
        });
        it('should not unpause if not owner', async() =>{
          await princessNft.pause()  
            await expect(princessNft.connect(addr1).unpause()).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(princessNft.connect(addr2).unpause()).to.be.revertedWith("Ownable: caller is not the owner");
            expect(await princessNft.paused()).to.equal(true) 
        });
        it('only owner can set baseUri', async() =>{  
            await expect(princessNft.connect(addr1).setBaseURI('oladimeji.json')).to.be.revertedWith("Ownable: caller is not the owner"); 
        });

        it('only owner can set merkle root', async() =>{
          await princessNft.setWhitelistMerkleRoot('0x53be9b3fa391eb8fd1090f702a7eb224a5f2b29f56647c7cd436cabe9010ce84')  
          expect(await princessNft.whitelistMerkleRoot()).to.equal('0x53be9b3fa391eb8fd1090f702a7eb224a5f2b29f56647c7cd436cabe9010ce84')
          await expect(princessNft.connect(addr1).setWhitelistMerkleRoot('0x53be9b3fa391eb8fd1090f702a7eb224a5f2b29f56647c7cd436cabe9010ce84')).to.be.revertedWith("Ownable: caller is not the owner");
        });



        it('should transfer ownership during deployment to address1',async() =>{
            let princessNftContract = await ethers.getContractFactory('Princess');
            princessNft =  await princessNftContract.deploy(uri,addr1.address);
             expect(await princessNft.owner()).to.equal(addr1.address);
             await expect(princessNft.pause()).to.be.revertedWith("Ownable: caller is not the owner");
           expect(await princessNft.paused()).to.equal(false) 
           await princessNft.connect(addr1).pause()
           expect(await princessNft.paused()).to.equal(true) 
        })

        it('should call mintOwner only if owner', async() =>{
            await princessNft.mintOwner(3)
            expect(await princessNft.ownerOf(1)).to.equal(owner.address)
            expect(await princessNft.ownerOf(2)).to.equal(owner.address) 
            expect(await princessNft.ownerOf(3)).to.equal(owner.address)
            await expect(princessNft.connect(addr1).mintOwner(5)).to.be.revertedWith("Ownable: caller is not the owner")
            await expect(princessNft.ownerOf(4)).to.be.revertedWith("ERC721: owner query for nonexistent token")
        })

         it('owner can call mintOwner even when paused', async() =>{
            await princessNft.pause()  
            await expect(princessNft.mint(2,'3',[])).to.be.revertedWith("Pausable: paused");
            await princessNft.mintOwner(3)
            expect(await princessNft.ownerOf(1)).to.equal(owner.address)
            expect(await princessNft.ownerOf(2)).to.equal(owner.address) 
            expect(await princessNft.ownerOf(3)).to.equal(owner.address)
        });

        it('only owner can set price', async() =>{  
            await expect(princessNft.connect(addr1).setPriceInWei(ethers.utils.parseEther('1000').toString())).to.be.revertedWith("Ownable: caller is not the owner"); 
            expect(await princessNft.priceInWei()).to.equal(0)
            await princessNft.setPriceInWei(ethers.utils.parseEther('1000').toString())
            expect(await princessNft.priceInWei()).to.equal(ethers.utils.parseEther('1000').toString())
        });
    });
    describe('minting process', () =>{
        it('should revert if msg.sender is not whitelisted', async() =>{
            const allowance = addressDict[owner.address]?addressDict[owner.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
             const mintLeaf = HashWhiteListToken(owner.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await expect(princessNft.mint(1,allowance,merkleProof)).to.be.revertedWith("Invalid Merkle Tree proof supplied."); 

        });
        it('should revert if msg.sender is whitelisted but sends wrong proof', async() =>{
            addressDict[addr1.address] = '10'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken("0x2A0908f3D83f8f4C40e1a86a413008D93bEB5A24",addressDict["0x2A0908f3D83f8f4C40e1a86a413008D93bEB5A24"])
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await expect(princessNft.connect(addr1).mint(5,allowance,merkleProof)).to.be.revertedWith("Invalid Merkle Tree proof supplied."); 

        });
        it('should run if msg.sender is whitelisted and sends correct proof', async() =>{
            addressDict[addr1.address] = '10'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken(addr1.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await princessNft.connect(addr1).mint(5,allowance,merkleProof)
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            expect(await princessNft.ownerOf(1)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(2)).to.equal(addr1.address) 
            expect(await princessNft.ownerOf(3)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(4)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(5)).to.equal(addr1.address)
            await expect(princessNft.ownerOf(6)).to.be.revertedWith("ERC721: owner query for nonexistent token")

        });

        it('should revert if msg.sender is whitelisted,sends correct proof but incorrect allowance', async() =>{
            addressDict[addr1.address] = '10'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken(addr1.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.connect(addr1).mint(5,'12',merkleProof)).to.be.revertedWith("Invalid Merkle Tree proof supplied.")
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")

        });
        it('should revert if msg.sender is whitelisted,sends correct proof but tries to mint above allowance', async() =>{
            addressDict[addr1.address] = '5'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken(addr1.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await princessNft.connect(addr1).mint(3,allowance,merkleProof)
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
             expect(await princessNft.ownerOf(1)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(2)).to.equal(addr1.address) 
            expect(await princessNft.ownerOf(3)).to.equal(addr1.address)
            await expect(princessNft.connect(addr1).mint(3,allowance,merkleProof)).to.be.revertedWith('count exceeds allowance for this address')
            await expect(princessNft.ownerOf(4)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await princessNft.connect(addr1).mint(2,allowance,merkleProof)
            expect(await princessNft.ownerOf(4)).to.be.equal(addr1.address)
             expect(await princessNft.ownerOf(5)).to.be.equal(addr1.address)
        });
        it('should revert if msg.sender is whitelisted,sends correct proof but tries to mint above max tx', async() =>{
            addressDict[addr1.address] = '22'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken(addr1.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.connect(addr1).mint(21,allowance,merkleProof)).to.be.revertedWith("Exceeds max per transaction.")
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")

        });

        it('should return correct token uri', async() =>{
            addressDict[addr1.address] = '10'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken(addr1.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await princessNft.connect(addr1).mint(5,allowance,merkleProof)
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            expect(await princessNft.ownerOf(1)).to.equal(addr1.address) 
            expect(await princessNft.ownerOf(2)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(3)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(4)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(5)).to.equal(addr1.address)
            await expect(princessNft.ownerOf(6)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            expect(await princessNft.tokenURI(1)).to.equal(`${uri}1.json`)
            expect(await princessNft.tokenURI(2)).to.equal(`${uri}2.json`)
            expect(await princessNft.tokenURI(3)).to.equal(`${uri}3.json`)
            expect(await princessNft.tokenURI(4)).to.equal(`${uri}4.json`)
            expect(await princessNft.tokenURI(5)).to.equal(`${uri}5.json`)
            await expect(princessNft.tokenURI(6)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token")
        });
        

         it('should revert if msg.sender doesnt send the correct price and run with correct price', async() =>{
            addressDict[addr1.address] = '10'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken(addr1.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await princessNft.setPriceInWei(ethers.utils.parseEther('1').toString())
            await expect(princessNft.connect(addr1).mint(5,allowance,merkleProof,{value:ethers.utils.parseEther('4.99').toString()})).to.be.revertedWith("Invalid funds provided.")
            await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await expect(princessNft.ownerOf(1)).to.be.revertedWith("ERC721: owner query for nonexistent token")
            await princessNft.connect(addr1).mint(5,allowance,merkleProof,{value:ethers.utils.parseEther('5').toString()})
            expect(await princessNft.ownerOf(1)).to.equal(addr1.address) 
            expect(await princessNft.ownerOf(2)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(3)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(4)).to.equal(addr1.address)
            expect(await princessNft.ownerOf(5)).to.equal(addr1.address)

        });

         it('should withdraw if owner', async() =>{
            addressDict[addr1.address] = '10'
            const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
            console.log(allowance)
            const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
            const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
            const rootHash = whiteListTree.getHexRoot()
            await princessNft.setWhitelistMerkleRoot(rootHash)
             const mintLeaf = HashWhiteListToken(addr1.address,allowance)
            const merkleProof = whiteListTree.getHexProof(mintLeaf)
            await princessNft.setPriceInWei(ethers.utils.parseEther('1').toString())
            await princessNft.connect(addr1).mint(5,allowance,merkleProof,{value:ethers.utils.parseEther('5').toString()})
            await expect(princessNft.connect(addr1).withdraw()).to.be.revertedWith("Ownable: caller is not the owner")
            let ownerBalance = await ethers.provider.getBalance(owner.address)
            let contBalance = await ethers.provider.getBalance(princessNft.address)
            await princessNft.withdraw()
            let contBalance2 = await ethers.provider.getBalance(princessNft.address)
            let bal = ownerBalance + ethers.utils.parseEther('5')
            let bal1 = await ethers.provider.getBalance(owner.address)
            console.log(await ethers.utils.formatEther(ownerBalance),await ethers.utils.formatEther(bal1))
             expect(parseInt(bal)).to.greaterThan(parseInt(bal1))
             expect(contBalance2).to.equal(contBalance - await ethers.utils.parseEther('5'))

        });


        // it('should revert if msg.sender is whitelisted,sends correct proof but tries to mint above max supply', async() =>{
        //     addressDict[addr1.address] = '2000'
        //     addressDict[addr2.address] = '20'
        //     const allowance = addressDict[addr1.address]?addressDict[addr1.address]:'0'
        //     console.log(allowance)
        //     const whiteListLeaves = Object.entries(addressDict).map(addr => HashWhiteListToken(...addr))
        //     const whiteListTree = new MerkleTree(whiteListLeaves, keccak256, {sortPairs: true})
        //     const rootHash = whiteListTree.getHexRoot()
        //     await princessNft.setWhitelistMerkleRoot(rootHash)
        //      const mintLeaf = HashWhiteListToken(addr1.address,allowance)
        //      const mintLeaf2 = HashWhiteListToken(addr2.address,addressDict[addr2.address])
        //     const merkleProof = whiteListTree.getHexProof(mintLeaf)
        //     const merkleProof2 = whiteListTree.getHexProof(mintLeaf2)
        //     await expect(princessNft.ownerOf(0)).to.be.revertedWith("ERC721: owner query for nonexistent token")
        //     for(let i=20; i<=2000; i=i+20){
        //         await princessNft.connect(addr1).mint(20,allowance,merkleProof)
        //     }
        //     expect(await princessNft.ownerOf(0)).to.be.equal(addr1.address)
        //     expect(await princessNft.ownerOf(1999)).to.be.equal(addr1.address)
        //     expect(await princessNft.balanceOf(addr1.address)).to.be.equal(2000)
        //     await expect(princessNft.ownerOf(2000)).to.be.revertedWith("ERC721: owner query for nonexistent token")

        //     await expect(princessNft.connect(addr2).mint(1,addressDict[addr2.address],merkleProof2)).to.be.revertedWith("Excedes max supply.")
        //     await expect(princessNft.ownerOf(2000)).to.be.revertedWith("ERC721: owner query for nonexistent token")

        // });
    })
})