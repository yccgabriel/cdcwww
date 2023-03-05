/* Amplify Params - DO NOT EDIT
	API_CDCGQL_GRAPHQLAPIENDPOINTOUTPUT
	API_CDCGQL_GRAPHQLAPIIDOUTPUT
	API_CDCGQL_GRAPHQLAPIKEYOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import crypto from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { default as fetch, Request } from 'node-fetch';

const GRAPHQL_ENDPOINT = process.env.API_CDCGQL_GRAPHQLAPIENDPOINTOUTPUT;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';
const { Sha256 } = crypto;

const getProductQuery = /* GraphQL */ `
  query GET_PRODUCT ($id: ID!) {
    getProduct ( id: $id ) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;
const createProductMutation = /* GraphQL */ `
  mutation CREATE_PRODUCT ($id: ID!, $name: String) {
    createProduct (
      input: { id: $id, name: $name }
    ) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;
const updateProductMutation = /* GraphQL */ `
  mutation UPDATE_PRODUCT ($id: ID!, $name: String) {
    updateProduct (
      input: { id: $id, name: $name }
    ) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;
const deleteProductMutation = /* GraphQL */ `
  mutation DELETE_PRODUCT ($id: ID!) {
    deleteProduct (
      input: { id: $id }
    ) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

const dorequest = async (payload) => {
    const endpoint = new URL(GRAPHQL_ENDPOINT);
  
    const signer = new SignatureV4({
      credentials: defaultProvider(),
      region: AWS_REGION,
      service: 'appsync',
      sha256: Sha256
    });
  
    const requestToBeSigned = new HttpRequest({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        host: endpoint.host
      },
      hostname: endpoint.host,
      body: payload,
      path: endpoint.pathname
    });
  
    const signed = await signer.sign(requestToBeSigned);
    const request = new Request(endpoint, signed);
  
    let statusCode = 200;
    let body;
    let response;
  
    response = await fetch(request);
    body = await response.json();
    
    if ( body.errors ) {
      console.error('errors', JSON.stringify(body));
      throw new Error(body.errors);
    }
    
    return { body, statusCode };
  }

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export const handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    if (
      event[0].payload.value === null
    ) {
      // debezium firing two messages for delete item.  check kafka messages for details.
      return 'ignore tombstone message';
    }

    const targetId = event[0].payload.key.id;
  
    const payload = JSON.stringify({
      query: getProductQuery,
      variables: { id: targetId },
    });
    const { body:querybody } = await dorequest(payload);

    const haveProduct = querybody.data.getProduct !== null;

    const isDelete = event[0].payload.value.after === null;
  
    if ( isDelete && haveProduct ) {

      const payload = JSON.stringify({
        query: deleteProductMutation,
        variables: { id: targetId },
      });
      const { body } = await dorequest(payload);
      return 'deleted: ' + JSON.stringify(body);

    } else if ( isDelete && ! haveProduct ) {

      const message = 'ignored delete id: ' + targetId;
      console.log(message);
      return message;

    } else if ( ! isDelete && ! haveProduct ) {

      // product not exist. create product.
      const payload = JSON.stringify({
        query: createProductMutation,
        variables: { id: targetId, name: JSON.parse(event[0].payload.value.after.name).en_US },
      });
      const { body } = await dorequest(payload);
      return 'created: ' + JSON.stringify(body);

    } else if ( ! isDelete && haveProduct ) {

      // product exists. update product.
      const payload = JSON.stringify({
        query: updateProductMutation,
        variables: { id: targetId, name: JSON.parse(event[0].payload.value.after.name).en_US },
      });
      const { body } = await dorequest(payload);
      return 'updated: ' + JSON.stringify(body);

    } else {

      throw new Error('should not reach here!');

    }
  };
