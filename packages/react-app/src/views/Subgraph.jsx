import { gql, useQuery } from "@apollo/client";
import { Button, Input, Table, Typography } from "antd";
import "antd/dist/antd.css";
import GraphiQL from "graphiql";
import "graphiql/graphiql.min.css";
import fetch from "isomorphic-fetch";
import React, { useState } from "react";
import { Address } from "../components";

const highlight = {
  marginLeft: 4,
  marginRight: 8,
  /* backgroundColor: "#f9f9f9", */ padding: 4,
  borderRadius: 4,
  fontWeight: "bolder",
};

function Subgraph(props) {
  function graphQLFetcher(graphQLParams) {
    return fetch(props.subgraphUri, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphQLParams),
    }).then(response => response.json());
  }

  const EXAMPLE_GRAPHQL = `
  {
    games {
      id,
      height,
      width,
      restartBlockNumber,
      nextCurseBlockNumber,
      gameOn,
      createdAt
    },
    players {
        id,
        x,
        y,
        loogieId,
        health,
     	  lastAction,
        lastActionBlock
    },
    worldMatrixes {
      id,
      x,
      y,
      healthAmountToCollect,
      cursed,
      player {
        id,
        loogieId,
        health,
      }
    }
  }
  `;

  const EXAMPLE_GQL = gql(EXAMPLE_GRAPHQL);
  const { loading, data } = useQuery(EXAMPLE_GQL, { pollInterval: 2500 });

  const worldMatrixColumns = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "cursed",
      dataIndex: "cursed",
      key: "cursed",
      render: record => {
        console.log("🚀 ~ file: Subgraph.jsx ~ line 54 ~ Subgraph ~ record", record);
        return `${record}`;
      },
    },
    {
      title: "health to collect",
      dataIndex: "healthAmountToCollect",
      key: "healthAmountToCollect",
    },
    {
      title: "player",
      dataIndex: "player",
      key: "playerAddress",
      render: record =>
        record ? <Address value={record.id} ensProvider={props.mainnetProvider} fontSize={16} /> : null,
    },
    {
      title: "player health",
      dataIndex: "player",
      key: "playerHealth",
      render: record => {
        console.log("🚀 ~ file: Subgraph.jsx ~ line 84 ~ Subgraph ~ record", record);
        return record ? parseInt(record.health, 10) : null;
      },
    },
  ];

  const playerColumns = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
      render: record => (record ? <Address value={record} ensProvider={props.mainnetProvider} fontSize={16} /> : null),
    },
    {
      title: "health",
      dataIndex: "health",
      key: "health",
    },
    {
      title: "x",
      dataIndex: "x",
      key: "x",
    },
    {
      title: "y",
      dataIndex: "y",
      key: "y",
    },
  ];

  const gameColumns = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "height",
      dataIndex: "height",
      key: "height",
    },
    {
      title: "width",
      dataIndex: "width",
      key: "width",
    },
    {
      title: "restart block number",
      dataIndex: "restartBlockNumber",
      key: "restartBlockNumber",
    },
    {
      title: "next curse block number",
      dataIndex: "nextCurseBlockNumber",
      key: "nextCurseBlockNumber",
    },
    // {
    //   title: "gameOn",
    //   dataIndex: "gameOn",
    //   key: "gameOn",
    // },
    // {
    //   title: "createdAt",
    //   dataIndex: "createdAt",
    //   key: "createdAt",
    // },
  ];

  const deployWarning = (
    <div style={{ marginTop: 8, padding: 8 }}>Warning: 🤔 Have you deployed your subgraph yet?</div>
  );

  return (
    <>
      <div style={{ margin: "auto", marginTop: 32 }}>
        You will find that parsing/tracking events with the{" "}
        <span className="highlight" style={highlight}>
          useEventListener
        </span>{" "}
        hook becomes a chore for every new project.
      </div>
      <div style={{ margin: "auto", marginTop: 32 }}>
        Instead, you can use{" "}
        <a href="https://thegraph.com/docs/about/introduction" target="_blank" rel="noopener noreferrer">
          The Graph
        </a>{" "}
        with 🏗 scaffold-eth (
        <a href="https://youtu.be/T5ylzOTkn-Q" target="_blank" rel="noopener noreferrer">
          learn more
        </a>
        ):
      </div>

      <div style={{ margin: 32 }}>
        <span style={{ marginRight: 8 }}>⛓️</span>
        Make sure your local chain is running first:
        <span className="highlight" style={highlight}>
          yarn chain
        </span>
      </div>

      <div style={{ margin: 32 }}>
        <span style={{ marginRight: 8 }}>🚮</span>
        Clean up previous data, if there is any:
        <span className="highlight" style={highlight}>
          yarn clean-graph-node
        </span>
      </div>

      <div style={{ margin: 32 }}>
        <span style={{ marginRight: 8 }}>📡</span>
        Spin up a local graph node by running
        <span className="highlight" style={highlight}>
          yarn run-graph-node
        </span>
        <span style={{ marginLeft: 4 }}>
          {" "}
          (requires{" "}
          <a href="https://www.docker.com/products/docker-desktop" target="_blank" rel="noopener noreferrer">
            {" "}
            Docker
          </a>
          ){" "}
        </span>
      </div>

      <div style={{ margin: 32 }}>
        <span style={{ marginRight: 8 }}>📝</span>
        Create your <b>local subgraph</b> by running
        <span className="highlight" style={highlight}>
          yarn graph-create-local
        </span>
        (only required once!)
      </div>

      <div style={{ margin: 32 }}>
        <span style={{ marginRight: 8 }}>🚢</span>
        Deploy your <b>local subgraph</b> by running
        <span className="highlight" style={highlight}>
          yarn graph-ship-local
        </span>
      </div>

      <div style={{ margin: 32 }}>
        <span style={{ marginRight: 8 }}>🖍️</span>
        Edit your <b>local subgraph</b> in
        <span className="highlight" style={highlight}>
          packages/subgraph/src
        </span>
        (learn more about subgraph definition{" "}
        <a href="https://thegraph.com/docs/define-a-subgraph" target="_blank" rel="noopener noreferrer">
          here
        </a>
        )
      </div>

      <div style={{ margin: 32 }}>
        <span style={{ marginRight: 8 }}>🤩</span>
        Deploy your <b>contracts and your subgraph</b> in one go by running
        <span className="highlight" style={highlight}>
          yarn deploy-and-graph
        </span>
      </div>

      <div style={{ width: "100%", paddingBottom: 64 }}>
        {data ? (
          <>
            <Table dataSource={data.games} columns={gameColumns} rowKey="id" />
            <Table dataSource={data.players} columns={playerColumns} rowKey="id" />
            <Table dataSource={data.worldMatrixes} columns={worldMatrixColumns} rowKey="id" />
          </>
        ) : (
          <Typography>{loading ? "Loading..." : deployWarning}</Typography>
        )}

        <div style={{ margin: 32, height: 400, border: "1px solid #888888", textAlign: "left" }}>
          <GraphiQL fetcher={graphQLFetcher} docExplorerOpen query={EXAMPLE_GRAPHQL} />
        </div>
      </div>

      <div style={{ padding: 64 }}>...</div>
    </>
  );
}

export default Subgraph;
