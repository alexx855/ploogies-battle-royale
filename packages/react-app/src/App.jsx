import { Button, Col, Row, Card, List, Menu, Tooltip } from "antd";
import Blockies from "react-blockies";
import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import {
  Account,
  Contract,
  Faucet,
  GasGauge,
  Header,
  Ramp,
  ThemeSwitch,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
} from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import { Home, ExampleUI, Hints, Subgraph } from "./views";
import { useStaticJsonRPC } from "./hooks";
import { gql, useQuery } from "@apollo/client";

const fetchLoogies = async (address, readContracts) => {
  const loogies = [];
  let loogiesBalance = 0;

  try {
    let lbalance = await readContracts.Loogies.balanceOf(address);

    // PLOOG owned by user address
    if (lbalance && lbalance.toNumber) {
      loogiesBalance += lbalance.toNumber();
    }

    for (let tokenIndex = 0; tokenIndex < lbalance.toNumber(); tokenIndex++) {
      const tokenId = await readContracts.Loogies.tokenOfOwnerByIndex(address, tokenIndex);
      // if (DEBUG) console.log("Getting loogie tokenId: ", tokenId);
      const tokenURI = await readContracts.Loogies.tokenURI(tokenId);
      // if (DEBUG) console.log("tokenURI: ", tokenURI);
      // const jsonManifestString = atob(tokenURI.substring(29));
      const jsonManifestString = Buffer.from(tokenURI.substring(29), "base64");

      const jsonManifest = JSON.parse(jsonManifestString);
      loogies.push({
        id: tokenId,
        symbol: "PLOOG",
        uri: tokenURI,
        playing: false,
        owner: address,
        ...jsonManifest,
      });
    }
  } catch (error) {
    console.log("Error getting loogies balance: ", error);
  }

  return { loogies, loogiesBalance };
};

const { ethers } = require("ethers");
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "mainnet", "rinkeby"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  // useOnBlock(localProvider, () => {
  //   console.log(`⛓ A new block is here: ${localProvider._lastBlockNumber}`);
  //   setGameBlock(localProvider._lastBlockNumber);
  // });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  const { gameBlock, setGameBlock } = useState(10);

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "YourContract", "purpose");
  const width = 24;
  const height = 24;

  const WORLD_PLAYER_GRAPHQL = `
    {
      worldMatrixes(
        where: {player_not: null}
        ) {
            id
            x
            y
            healthAmountToCollect
            player {
              id
              address
              loogieId
              health
            }
      }
    }
  `;
  const WORLD_PLAYER_GQL = gql(WORLD_PLAYER_GRAPHQL);
  const worldPlayerData = useQuery(WORLD_PLAYER_GQL, { pollInterval: 10000 });

  // console.log("worldPlayerData: ", worldPlayerData);

  const WORLD_HEALTH_GRAPHQL = `
    {
      worldMatrixes(
        where: {healthAmountToCollect_gt: 0}
        ) {
            id
            x
            y
            healthAmountToCollect
            player {
              id
              address
              loogieId
              health
            }
      }
    }
  `;

  const WORLD_HEALTH_GQL = gql(WORLD_HEALTH_GRAPHQL);
  const worldHealthData = useQuery(WORLD_HEALTH_GQL, { pollInterval: 2500 });

  // console.log("worldHealthData: ", worldHealthData);

  const [yourLoogiesBalance, setYourLoogiesBalance] = useState(0);
  const [yourLoogies, setYourLoogies] = useState();

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 1;

  // Update user nfts
  useEffect(() => {
    //  loogies
    if (DEBUG) console.log("Updating loogies balance...");

    if (readContracts.Loogies) {
      async function fetchData() {
        // You can await here
        const { loogies, loogiesBalance } = await fetchLoogies(address, readContracts);
        setYourLoogies(loogies.reverse());
        setYourLoogiesBalance(loogiesBalance);
        setLoading(false);
      }
      fetchData();
    } else {
      if (DEBUG) console.log("Loogies contracts not defined yet.");
    }
  }, [address, readContracts]);

  // const [activePlayer, setActivePlayer] = useState();

  // useEffect(() => {
  //   let active = false;
  //   if (address && worldPlayerData.data && worldPlayerData.data?.worldMatrixes) {
  //     for (let p in worldPlayerData.data.worldMatrixes) {
  //       if (worldPlayerData.data.worldMatrixes[p].player.address.toLowerCase() === address.toLowerCase()) {
  //         active = true;
  //       }
  //     }
  //   }

  //   setActivePlayer(active);
  // }, [address, readContracts.Game, worldPlayerData.data]);

  const [playerData, setPlayerData] = useState();
  const [currentPlayer, setCurrentPlayer] = useState();

  useEffect(() => {
    const updatePlayersData = async () => {
      if (readContracts.Game) {
        console.log("PARSE PLAYERS:::", worldPlayerData);
        try {
          let playerData = {};

          if (worldPlayerData.data && worldPlayerData.data.worldMatrixes?.length > 0) {
            const playersData = worldPlayerData.data.worldMatrixes;
            for (let p in playersData) {
              const currentPosition = playersData[p];
              console.log("loading info for ", currentPosition);
              const tokenURI = await readContracts.Game.tokenURIOf(currentPosition.player.address);
              const jsonManifestString = Buffer.from(tokenURI.substring(29), "base64");
              const jsonManifest = JSON.parse(jsonManifestString);
              const info = {
                health: parseInt(currentPosition.player.health),
                position: { x: currentPosition.x, y: currentPosition.y },
                //contract: await readContracts.Game.yourContract(worldPlayerData.data[p]),
                image: jsonManifest.image,
                gold: parseInt(currentPosition.player.token),
                address: currentPosition.player.address,
              };
              playerData[currentPosition.player.address] = info;
              if (address && currentPosition.player.address.toLowerCase() === address.toLowerCase()) {
                setCurrentPlayer(info);
              }
            }
          } else {
            console.log("No players data");
          }
          console.log("final player info", playerData);
          setPlayerData(playerData);
        } catch (error) {
          console.log(error);
        }
      } else {
        console.log("Contracts not defined yet.");
      }
    };
    updatePlayersData();
  }, [address, worldPlayerData, readContracts.Game]);

  const s = 64;
  const squareW = s;
  const squareH = s;

  const [worldView, setWorldView] = useState();

  useEffect(() => {
    console.log("🚀 ~ file: App.jsx ~ line 472 ~ useEffect ~ playerData", playerData);

    console.log("rendering world...");
    if (worldHealthData.data) {
      console.log("🚀 ~ file: App.jsx ~ line 371 ~ useEffect ~ worldHealthData.data", worldHealthData.data);
      console.log("rendering world2...");
      let worldUpdate = [];
      for (let y = 0; y < height; y++) {
        for (let x = width - 1; x >= 0; x--) {
          let healthHere = 0;

          for (let d in worldHealthData.data.worldMatrixes) {
            if (worldHealthData.data.worldMatrixes[d].x === x && worldHealthData.data.worldMatrixes[d].y === y) {
              healthHere = parseInt(worldHealthData.data.worldMatrixes[d].healthAmountToCollect);
            }
          }

          let fieldDisplay = "";

          if (healthHere > 0) {
            fieldDisplay = (
              <img
                alt="Health"
                src="Health_Full.svg"
                style={{
                  width: "100%",
                  height: "100%",
                  transform: "sacale(1.5)",
                }}
              />
            );
          }

          //look for players here...
          let playerDisplay = "";

          for (let p in playerData) {
            if (playerData[p].position.x === x && playerData[p].position.y === y) {
              const player = playerData[p];
              playerDisplay = (
                <Tooltip title={player.address}>
                  <div style={{ position: "relative", height: "100%", width: "100%" }}>
                    {currentPlayer?.address && currentPlayer.address.toLowerCase() === player.address.toLowerCase() && (
                      <Blockies address={player.address} size={8} scale={7.5} />
                    )}

                    {/* show player.health */}
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        textAlign: "center",
                        width: "100%",
                        fontSize: "1.5rem",
                        color: "red",
                        fontWeight: "bold",
                        textShadow: "0 0 5px black",
                        zIndex: 4,
                      }}
                    >
                      {player.health}
                    </span>
                    <img
                      alt={player.address}
                      src={player.image}
                      style={{
                        transform: "scale(3, 3)",
                        width: "100%",
                        height: "100%",
                        top: -20,
                        position: "absolute",
                        left: 0,
                        zIndex: 3,
                      }}
                    />
                  </div>
                </Tooltip>
              );
            }
          }

          console.log("🚀 ~ file: App.jsx ~ line 447 ~ useEffect ~ currentPlayer", currentPlayer);

          worldUpdate.push(
            <div
              key={`${x}-${y}`}
              style={{
                width: squareW,
                height: squareH,
                padding: 1,
                position: "absolute",
                left: squareW * x,
                top: squareH * y,
                overflow: "visible",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "100%",
                  width: "100%",
                  background: (x + y) % 2 ? "#BBBBBB" : "#EEEEEE",
                }}
              >
                {playerDisplay ? playerDisplay : <span style={{ opacity: 0.4 }}>{"" + x + "," + y}</span>}
                <div style={{ opacity: 0.7, position: "absolute", left: 0, top: 0 }}>{fieldDisplay}</div>
              </div>
            </div>,
          );
        }
      }
      setWorldView(worldUpdate);
    }
  }, [squareH, squareW, worldHealthData.data, playerData, currentPlayer]);

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    myMainnetDAIBalance,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header>
        {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flex: 1 }}>
            {USE_NETWORK_SELECTOR && (
              <div style={{ marginRight: 20 }}>
                <NetworkSwitch
                  networkOptions={networkOptions}
                  selectedNetwork={selectedNetwork}
                  setSelectedNetwork={setSelectedNetwork}
                />
              </div>
            )}
            <Account
              useBurner={USE_BURNER_WALLET}
              address={address}
              localProvider={localProvider}
              userSigner={userSigner}
              mainnetProvider={mainnetProvider}
              price={price}
              web3Modal={web3Modal}
              loadWeb3Modal={loadWeb3Modal}
              logoutOfWeb3Modal={logoutOfWeb3Modal}
              blockExplorer={blockExplorer}
            />
          </div>
        </div>
      </Header>
      {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
        <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
      )}
      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />
      <Menu style={{ textAlign: "center", marginTop: 20 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link to="/">App Home</Link>
        </Menu.Item>
        <Menu.Item key="/play">
          <Link to="/play">Play</Link>
        </Menu.Item>
        <Menu.Item key="/debug">
          <Link to="/debug">Debug Contracts</Link>
        </Menu.Item>
        <Menu.Item key="/hints">
          <Link to="/hints">Hints</Link>
        </Menu.Item>
        <Menu.Item key="/exampleui">
          <Link to="/exampleui">ExampleUI</Link>
        </Menu.Item>
        <Menu.Item key="/mainnetdai">
          <Link to="/mainnetdai">Mainnet DAI</Link>
        </Menu.Item>
        <Menu.Item key="/subgraph">
          <Link to="/subgraph">Subgraph</Link>
        </Menu.Item>
      </Menu>

      <Switch>
        <Route exact path="/">
          {/* pass in any web3 props to this Home component. For example, yourLocalBalance */}
          <Home yourLocalBalance={yourLocalBalance} readContracts={readContracts} />
        </Route>

        <Route exact path="/play">
          <div style={{ position: "absolute", right: 50, top: 150, width: 600, zIndex: 10 }}>
            {!currentPlayer && (
              <div>
                <div style={{ padding: 4 }}>
                  {loading || (yourLoogies && yourLoogies.length > 0) ? (
                    <div id="your-loogies" style={{ paddingTop: 20 }}>
                      <div>
                        <List
                          grid={{
                            gutter: 1,
                            xs: 1,
                            sm: 1,
                            md: 1,
                            lg: 1,
                            xl: 1,
                            xxl: 1,
                          }}
                          pagination={{
                            total: yourLoogiesBalance,
                            defaultPageSize: perPage,
                            defaultCurrent: page,
                            onChange: currentPage => {
                              setPage(currentPage);
                            },
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${yourLoogiesBalance} items`,
                          }}
                          loading={loading}
                          dataSource={yourLoogies}
                          renderItem={item => {
                            const id = item.id.toNumber();

                            return (
                              <List.Item key={id + "_" + item.uri + "_" + item.owner}>
                                <Card
                                  style={{
                                    backgroundColor: "#b3e2f4",
                                    border: "1px solid #0071bb",
                                    borderRadius: 10,
                                    marginRight: 10,
                                  }}
                                  headStyle={{ paddingRight: 12, paddingLeft: 12 }}
                                  title={
                                    <div>
                                      <span style={{ fontSize: 16, marginRight: 8 }}>{item.name}</span>
                                      <Button
                                        onClick={async () => {
                                          setLoading(true);
                                          tx(writeContracts.Game.register(id)).then(async () => {
                                            if (DEBUG) console.log("Updating active player...");

                                            // try {
                                            //   const players = await readContracts.Game.getPlayers();
                                            //   if (DEBUG) console.log("players: ", players);
                                            //   const activePlayer = players.find(player => player === address);

                                            //   if (DEBUG) console.log("activePlayer: ", activePlayer);
                                            //   setActivePlayer(activePlayer);
                                            // } catch (error) {
                                            //   console.log(error);
                                            // }
                                          });
                                        }}
                                      >
                                        Register
                                      </Button>
                                    </div>
                                  }
                                >
                                  <img alt={item.id} src={item.image} width="240" />
                                </Card>
                              </List.Item>
                            );
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ minHeight: 200, fontSize: 30 }}>
                      <Card
                        style={{
                          backgroundColor: "#b3e2f4",
                          border: "1px solid #0071bb",
                          borderRadius: 10,
                          width: 600,
                          margin: "0 auto",
                          textAlign: "center",
                          fontSize: 16,
                        }}
                        title={
                          <div>
                            <span style={{ fontSize: 18, marginRight: 8, fontWeight: "bold" }}>
                              Do you need some Loogies?
                            </span>
                          </div>
                        }
                      >
                        <div>
                          <p>
                            You can mint a <strong>Loogie</strong> here
                          </p>
                          <p>
                            <button
                              onClick={async event => {
                                // event.target.parentElement.disabled = true;
                                const priceRightNow = await readContracts.Loogies.price();

                                // console.log(priceRightNow);
                                setLoading(true);

                                tx(writeContracts.Loogies.mintItem({ value: priceRightNow }), async function () {
                                  try {
                                    const { loogies, loogiesBalance } = await fetchLoogies(address, readContracts);
                                    setYourLoogies(loogies.reverse());
                                    setYourLoogiesBalance(loogiesBalance);
                                  } catch (error) {
                                    console.log("🚀 ~ file: App.jsx ~ line 794 ~ error", error);
                                  }

                                  setLoading(false);
                                });
                              }}
                              // href="javascript:void(0);"
                              size="large"
                              shape="round"
                            >
                              Mint
                            </button>
                          </p>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              position: "absolute",
              background: "rgba(0,0,0,0.5)",
              right: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              overflow: "hidden",
              zIndex: 9,
            }}
          >
            {currentPlayer && (
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: 10,
                  zIndex: 11,
                }}
                to="/"
              >
                <Button
                  title="LEFT"
                  disabled={!currentPlayer.health > 0}
                  onClick={async () => {
                    tx(writeContracts.Game.move(2));
                  }}
                >
                  LEFT
                </Button>
                <Button
                  title="RIGHT"
                  disabled={!currentPlayer.health > 0}
                  onClick={async () => {
                    tx(writeContracts.Game.move(3));
                  }}
                >
                  RIGHT
                </Button>
                <Button
                  title="UP"
                  disabled={!currentPlayer.health > 0}
                  onClick={async () => {
                    tx(writeContracts.Game.move(0));
                  }}
                >
                  UP
                </Button>
                <Button
                  title="DOWN"
                  disabled={!currentPlayer.health > 0}
                  onClick={async () => {
                    tx(writeContracts.Game.move(1));
                  }}
                >
                  DOWN
                </Button>

                <Button
                  title="Collect Health"
                  disabled={!currentPlayer.health > 0}
                  style={{ marginLeft: 10 }}
                  onClick={async () => {
                    tx(writeContracts.Game.collectHealth());
                  }}
                >
                  Collect Health
                </Button>
              </div>
            )}

            <div
              style={{
                position: "absolute",
                right: 10,
                textAlign: "right",
                top: 10,
                zIndex: 11,
              }}
              to="/"
            >
              Game block <strong>{gameBlock}</strong>{" "}
              <Link
                style={{
                  background: "rgba(0,0,0,0.5)",
                  padding: 10,
                  marginLeft: 10,
                }}
                to="/"
              >
                Close
              </Link>
            </div>

            <div
              style={{
                transform: "scale(0.6,0.6)",
                // transform: "rotate(-45deg) scale(0.4,0.4)",
                color: "#111111",
                fontWeight: "bold",
                width: width * squareW,
                height: height * squareH,
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: (-height * squareH) / 2,
                marginLeft: (-width * squareW) / 2,
                backgroundColor: "#b3e2f4",
              }}
            >
              {worldView}
            </div>
          </div>
        </Route>

        <Route exact path="/debug">
          {/*
                🎛 this scaffolding is full of commonly used components
                this <Contract/> component will automatically parse your ABI
                and give you a form to interact with it locally
            */}

          <Contract
            name="Game"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
          <Contract
            name="Loogies"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
          <Contract
            name="YourContract"
            price={price}
            signer={userSigner}
            provider={localProvider}
            address={address}
            blockExplorer={blockExplorer}
            contractConfig={contractConfig}
          />
        </Route>
        <Route path="/hints">
          <Hints
            address={address}
            yourLocalBalance={yourLocalBalance}
            mainnetProvider={mainnetProvider}
            price={price}
          />
        </Route>
        <Route path="/exampleui">
          <ExampleUI
            address={address}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            localProvider={localProvider}
            yourLocalBalance={yourLocalBalance}
            price={price}
            tx={tx}
            writeContracts={writeContracts}
            readContracts={readContracts}
            purpose={purpose}
          />
        </Route>
        <Route path="/mainnetdai">
          <Contract
            name="DAI"
            customContract={mainnetContracts && mainnetContracts.contracts && mainnetContracts.contracts.DAI}
            signer={userSigner}
            provider={mainnetProvider}
            address={address}
            blockExplorer="https://etherscan.io/"
            contractConfig={contractConfig}
            chainId={1}
          />
          {/*
            <Contract
              name="UNI"
              customContract={mainnetContracts && mainnetContracts.contracts && mainnetContracts.contracts.UNI}
              signer={userSigner}
              provider={mainnetProvider}
              address={address}
              blockExplorer="https://etherscan.io/"
            />
            */}
        </Route>
        <Route path="/subgraph">
          <Subgraph
            subgraphUri={props.subgraphUri}
            tx={tx}
            writeContracts={writeContracts}
            mainnetProvider={mainnetProvider}
          />
        </Route>
      </Switch>

      <ThemeSwitch />

      {/* 🗺 Extra UI like gas price, eth price, faucet, and support: */}
      <div style={{ position: "fixed", textAlign: "left", left: 0, bottom: 20, padding: 10 }}>
        <Row align="middle" gutter={[4, 4]}>
          <Col span={8}>
            <Ramp price={price} address={address} networks={NETWORKS} />
          </Col>

          <Col span={8} style={{ textAlign: "center", opacity: 0.8 }}>
            <GasGauge gasPrice={gasPrice} />
          </Col>
          <Col span={8} style={{ textAlign: "center", opacity: 1 }}>
            <Button
              onClick={() => {
                window.open("https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA");
              }}
              size="large"
              shape="round"
            >
              <span style={{ marginRight: 8 }} role="img" aria-label="support">
                💬
              </span>
              Support
            </Button>
          </Col>
        </Row>

        <Row align="middle" gutter={[4, 4]}>
          <Col span={24}>
            {
              /*  if the local provider has a signer, let's show the faucet:  */
              faucetAvailable ? (
                <Faucet localProvider={localProvider} price={price} ensProvider={mainnetProvider} />
              ) : (
                ""
              )
            }
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default App;
