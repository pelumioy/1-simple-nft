import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";
import "../flow/config.js";

export default function Home() {
  const [user, setUser] = useState({ loggedIn: false });
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false)
  const [recipient, setRecipient] = useState('');

  // This keeps track of the logged in 
  // user for you automatically.
  useEffect(() => {
    fcl.currentUser().subscribe(setUser);
  }, [])

  async function getNFTs() {

    const result = await fcl.send([
      fcl.script`
      import ExampleNFT from 0xDeployer
      import MetadataViews from 0xDeployer

      pub fun main(address: Address): [NFT] {
        let collection = getAccount(address).getCapability(ExampleNFT.CollectionPublicPath)
                          .borrow<&ExampleNFT.Collection{MetadataViews.ResolverCollection}>()
                          ?? panic("Could not borrow a reference to the collection")

        let ids = collection.getIDs()

        let answer: [NFT] = []

        for id in ids {
          // Get the basic display information for this NFT
          let nft = collection.borrowViewResolver(id: id)
          // Get the basic display information for this NFT
          let view = nft.resolveView(Type<MetadataViews.Display>())!
          let display = view as! MetadataViews.Display
          answer.append(
            NFT(
              id: id, 
              name: display.name, 
              description: display.description, 
              thumbnail: display.thumbnail
            )
          )
        }

        return answer
      }

      pub struct NFT {
        pub let id: UInt64
        pub let name: String 
        pub let description: String 
        pub let thumbnail: AnyStruct{MetadataViews.File}
        
        init(id: UInt64, name: String, description: String, thumbnail: AnyStruct{MetadataViews.File}) {
          self.id = id
          self.name = name 
          self.description = description
          self.thumbnail = thumbnail
        }
      }
      `,
      fcl.args([
        fcl.arg(user?.addr, t.Address)
      ])
    ]).then(fcl.decode);

    console.log(result)

    setList(result);
    setShow(true)
    console.log(list)
  }

  async function transferNFT(recipient, withdrawID) {

    const result = await fcl.send([
      fcl.transaction`
      import ExampleNFT from 0xDeployer
      import NonFungibleToken from 0xDeployer

      transaction(recipient: Address, withdrawID: UInt64) {
        let ProviderCollection: &ExampleNFT.Collection{NonFungibleToken.Provider}
        let RecipientCollection: &ExampleNFT.Collection{NonFungibleToken.CollectionPublic}
        
        prepare(signer: AuthAccount) {
          self.ProviderCollection = signer.borrow<&ExampleNFT.Collection{NonFungibleToken.Provider}>(from: ExampleNFT.CollectionStoragePath)
                                      ?? panic("This user does not have a Collection.")

          self.RecipientCollection = getAccount(recipient).getCapability(ExampleNFT.CollectionPublicPath)
                                      .borrow<&ExampleNFT.Collection{NonFungibleToken.CollectionPublic}>()!
        }

        execute {
          self.RecipientCollection.deposit(token: <- self.ProviderCollection.withdraw(withdrawID: withdrawID))
        }
      }
      `,
      fcl.args([
        fcl.arg(recipient, t.Address),
        fcl.arg(withdrawID, t.UInt64)
      ]),
      fcl.proposer(fcl.authz),
      fcl.payer(fcl.authz),
      fcl.authorizations([fcl.authz]),
      fcl.limit(999)
    ]).then(fcl.decode);

    console.log({transactionId});
    setList(result);
  }

  async function setupCollection() {

    const transactionId = await fcl.send([
      fcl.transaction`
      import ExampleNFT from 0xDeployer
      import NonFungibleToken from 0xDeployer
      import MetadataViews from 0xDeployer

      transaction() {
        
        prepare(signer: AuthAccount) {
          if signer.borrow<&ExampleNFT.Collection>(from: ExampleNFT.CollectionStoragePath) == nil {
            signer.save(<- ExampleNFT.createEmptyCollection(), to: ExampleNFT.CollectionStoragePath)
            signer.link<&ExampleNFT.Collection{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(ExampleNFT.CollectionPublicPath, target: ExampleNFT.CollectionStoragePath)
          }
        }

        execute {
          
        }
      }
      `,
      fcl.args([]),
      fcl.proposer(fcl.authz),
      fcl.payer(fcl.authz),
      fcl.authorizations([fcl.authz]),
      fcl.limit(999)
    ]).then(fcl.decode);

    console.log({transactionId});
  }

  return (
      <div className='bg-[#011E30] flex flex-col min-h-screen'>
        <Head>
          <title>1-SIMPLE-NFT</title>
          <meta name="description" content="Used by Emerald Academy" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className='container mx-auto flex-1 p-5'>
          <div className='mb-10 flex justify-between items-center pr-10 pt-2'>
            <h1 className={styles.sooth}>SIMPLE-NFT</h1>
            <div className='flex space-x-4 items-center'>
              <h1 className='text-[#38E8C6]'>Address: </h1>
              <h1 className='border px-7 text-center text-[#38E8C6] text-sm py-1 rounded-xl border-[#38E8C6] w-56'>{user.loggedIn ? user.addr : "Please connect wallet -->"}</h1>
            </div>
            <div>{!user.loggedIn ? <button className='border rounded-xl border-[#38E8C6] px-5 text-sm text-[#38E8C6] py-1' 
              onClick={fcl.authenticate}>connect</button> : <button className='border rounded-xl border-[#38E8C6]
              px-5 text-sm text-[#38E8C6] py-1' onClick={fcl.unauthenticate}>Logout</button>}
            </div>
          </div>
          <hr  className='border-[#38E8C6]'/>
          <div className='flex  flex-col items-center justify-center pt-10'>
              <div className='flex space-x-5'>
                <button onClick={setupCollection} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]">Setup Collection</button>
                <button onClick={getNFTs} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]">Get NFTs</button>
              </div>
              <div className='pt-20 w-full'>
                {show == false ? <div className='flex flex-col justify-center items-center'>
                  <img src='/whistle.svg' width={200} alt='nothing to see here'/>
                  <h1 className='pt-5 font-semibold text-gray-600'>Nothing to see here...yet. Create a new collection or get NFTs</h1>
                </div> : 
                  <div className='flex justify-around'>
                  {list.map((nft, index) => (
                    <div key={index} className="border shadow-lg bg-[#38E8C6] border-[#38E8C6] bg-opacity-40 bg-clip-padding rounded-lg backdrop-blur-sm p-4">
                      <div className='flex justify-between pb-2'>
                        <h1 className='font-semibold font-xl text-white'>{nft.name}</h1>
                        <p className='text-[#38E8C6] font-semibold'>{nft.id}</p>
                      </div>
                      <p className='text-gray-300 text-md'>{nft.description}</p>
                      <div className='flex justify-center py-2'>
                        <img src={`https://ipfs.infura.io/ipfs/${nft.thumbnail.url}`} width={150} />
                      </div>
                      <div className='flex flex-col pt-2'>
                        <input className="px-4 mb-1 py-1 focus:outline-none focus:border-[#38E8C6] focus:border-2 bg-green-100 border rounded-lg border-[#38E8C6]" type="text" onChange={e => setRecipient(e.target.value)} />
                        <button onClick={() => transferNFT(recipient, nft.id)} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]">Transfer</button>
                      </div>
                    </div>
                  ))}
                </div>}
              </div>
          </div>
        </main>
        <footer className='container mx-auto'>
          <img src='/city.svg' alt='city'/>
        </footer>
      </div>
  )
}
