// server.js
import express from 'express';
import axios from 'axios';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // For dev with self-signed certs

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Server is running! ✅');
  });

const getAccessToken = async () => {
  const loginUrl = 'https://demo.qliktag.io/api/v2/oauth';
  const payload = {
    data: {
      grantType: 'applicationId',
      applicationId: '9bab0010-ade3-11ed-8651-cb01ec77882a',
      secretKey: '9c269b32-8b77-44ee-91d4-16f9f4566d92',
    },
  };
  

  const response = await axios.post(loginUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const accessToken = response.data?.data?.accessToken;
  if (!accessToken) throw new Error('Access token not found in response');
  return accessToken;
};

const syncProductName = async () => {
  const SOURCE_API = 'https://apieuw.productmarketingcloud.com/api/v1.0.0/entities/154/fieldvalues';
  const API_KEY = '7b6f10d00ec69790fd8950c7eac438b6';
  const DEST_API = 'https://demo.qliktag.io/api/v2/entity/productpassport';

  const token = await getAccessToken();

  const fieldResponse = await axios.get(SOURCE_API, {
    headers: {
      Accept: 'text/plain',
      'X-inRiver-APIKey': API_KEY,
    },
  });

  const fieldValues = fieldResponse.data;
  const productNameField = fieldValues.find(item => item.fieldTypeId === 'ItemName');

  if (!productNameField?.value) throw new Error('ItemName field not found.');

  const patchPayload = {
    account: { _accountId: '9ba581d0-ade3-11ed-8651-cb01ec77882a' },
    _productpassportId: '97d0ec60-30b9-11f0-9590-3d0bfaca152c',
    data: {
      patch: [
        {
          op: 'replace',
          value: productNameField.value,
          path: '/data/identification/itemName',
        },
      ],
    },
  };

  const patchResp = await axios.patch(DEST_API, patchPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return patchResp.status;
};

const syncProductNameGarcia = async () => {
  const SOURCE_API = 'https://apieuw.productmarketingcloud.com/api/v1.0.0/entities/96013/fieldvalues';
  const API_KEY = '41ce35b46f77ec205da06f195adee8fb';
  const DEST_API = 'https://demo.qliktag.io/api/v2/entity/productpassport';

  const token = await getAccessToken();

  const fieldResponse = await axios.get(SOURCE_API, {
    headers: {
      Accept: 'text/plain',
      'X-inRiver-APIKey': API_KEY,
    },
  });

  const fieldValues = fieldResponse.data;

  // Extract desired fields
  const productNameField = fieldValues.find(item => item.fieldTypeId === 'ItemTitleGarcia');
  const productDescriptionField = fieldValues.find(item => item.fieldTypeId === 'ItemCommercialTextGarcia');
  const productMaterialField = fieldValues.find(item => item.fieldTypeId === 'ItemMaterial');
  const productRecycleMaterialField = fieldValues.find(item => item.fieldTypeId === 'ItemRecycledMaterialPercentage');

  const patchOperations = [];


  const getValue = field => field?.value?.en || field?.value || null;

  if (getValue(productNameField)) {
    patchOperations.push({
      op: 'replace',
      path: '/data/identification/itemName',
      value: getValue(productNameField),
    });
  }

  if (getValue(productDescriptionField)) {
    patchOperations.push({
      op: 'replace',
      path: '/data/identification/itemDescription',
      value: getValue(productDescriptionField),
    });
  }

  if (getValue(productMaterialField)) {
    patchOperations.push({
      op: 'replace',
      path: '/data/composition/compositionStatement',
      value: getValue(productMaterialField),
    });
  }

  if (productRecycleMaterialField?.value) {
    patchOperations.push({
      op: 'replace',
      path: '/data/usage/usageRecyclingInstructions',
      value: productRecycleMaterialField.value,
    });
  }

  if (patchOperations.length === 0) {
    throw new Error('No valid field values found to patch.');
  }

  const patchPayload = {
    account: { _accountId: '9ba581d0-ade3-11ed-8651-cb01ec77882a' },
    _productpassportId: '30890b50-527e-11f0-a2bb-a1cae3de64ff',
    data: {
      patch: patchOperations,
    },
  };

  const patchResp = await axios.patch(DEST_API, patchPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return patchResp.status;
};


app.post('/sync', async (req, res) => {
  try {
    const result = await syncProductName();
    res.status(200).send({ success: true, status: result });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).send({ error: err.message });
  }
});

app.post('/sync/garcia', async (req, res) => {
  try {
    const result = await syncProductNameGarcia();
    res.status(200).send({ success: true, status: result });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).send({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
