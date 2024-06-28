const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const dynamodbTableName = 'product-inventory';
const bucketName = 'hannahs-arts-crafts-images';
const healthPath = '/health';
const productPath = '/product';
const productsPath = '/products';

exports.handler = async function(event) {
  console.log('Request event: ', event);
  let response;
  switch(true) {
    case event.httpMethod === 'GET' && event.path === healthPath:
      response = buildResponse(200);
      break;
    case event.httpMethod === 'GET' && event.path === productPath:
      response = await getProduct(event.queryStringParameters.productId);
      break;
    case event.httpMethod === 'GET' && event.path === productsPath:
      response = await getProducts();
      break;
    case event.httpMethod === 'POST' && event.path === productPath:
      response = await saveProduct(JSON.parse(event.body));
      break;
    case event.httpMethod === 'PATCH' && event.path === productPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyProduct(requestBody.productId, requestBody.updateKey, requestBody.updateValue);
      break;
    case event.httpMethod === 'DELETE' && event.path === productPath:
      response = await deleteProduct(JSON.parse(event.body).productId);
      break;
  }
  return response;
};

async function getProduct(productId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'productId': productId
    }
  };
  return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item);
  }, (error) => {
    console.error('Console Log Error Handling: ', error);
  });
}

async function getProducts() {
  const params = {
    TableName: dynamodbTableName
  };
  const allProducts = await scanDynamoRecords(params, []);
  const body = {
    products: allProducts
  };
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartKey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (error) {
    console.error('Console Log Error Handling: ', error);
  }
}

async function saveProduct(requestBody) {
  const productId = requestBody.productId || Math.floor(Math.random() * 1000).toString();
  const imageType = requestBody.imageType || 'jpg'; 
  const contentType = imageType === 'png' ? 'image/png' : 'image/jpeg';

  const s3Params = {
    Bucket: bucketName,
    Key: `${productId}.${imageType}`,
    Expires: 60 * 5, 
    ContentType: contentType
  };
  const uploadURL = s3.getSignedUrl('putObject', s3Params);

  const params = {
    TableName: dynamodbTableName,
    Item: {
      productId: productId,
      name: requestBody.name,
      price: requestBody.price,
      description: requestBody.description,
      image: `https://${bucketName}.s3.amazonaws.com/${productId}.${imageType}` 
    }
  };

  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: 'SAVE',
      Message: 'SUCCESS',
      Item: params.Item,
      uploadURL: uploadURL 
    };
    return buildResponse(200, body);
  }, (error) => {
    console.error('Console Log Error Handling: ', error);
  });
}

async function modifyProduct(productId, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'productId': productId
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ':value': updateValue
    },
    ReturnValues: 'UPDATED_NEW'
  };
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: 'UPDATE',
      Message: 'SUCCESS',
      UpdatedAttributes: response
    };
    return buildResponse(200, body);
  }, (error) => {
    console.error('Console Log Error Handling: ', error);
  });
}

async function deleteProduct(productId) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'productId': productId
    },
    ReturnValues: 'ALL_OLD'
  };
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: 'DELETE',
      Message: 'SUCCESS',
      Item: response
    };
    return buildResponse(200, body);
  }, (error) => {
    console.error('Console Log Error Handling: ', error);
  });
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS, PUT'
    },
    body: JSON.stringify(body)
  };
}
