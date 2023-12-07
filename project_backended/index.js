require('dotenv').config();
require('express-async-errors');
const express = require('express');


const AuthenticatedClient = require('@hubspot/api-client');



const app = express();
const path = require('path');
// const cookie = require('cookie-parser');
const cookie = require('cookie');
const cors = require('cors');
const { connectDB, dbConfig } = require('./db');

const AuthorizeUrlBuilder = require('@hubspot/api-client');


const sequelize = require('./config');
// const addNewAuthentication = require('./index');

var LocalStorage = require('node-localstorage').LocalStorage;
const localStorage = new LocalStorage('./scratch');
const Sigin = require('./signin');
const Authentication = require('./models/Authentication');

const { LegalConsentOptionsLegitimateInterest } = require('@hubspot/api-client/lib/codegen/marketing/forms');
const User = require('./models/User');

app.use(
  cors({
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://api.hubspot.com', 'https://api.hubspot.com/settings/v3/users', '*'],
  })
);

app.use(express.json());
// app.use(cookie());

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const accessToken = process.env.ACCESS_TOKEN;

const authClient = new AuthenticatedClient.Client({
  clientId: clientId,
  clientSecret: clientSecret,
  accessToken: accessToken,
});





// app.get('/blogs', async (req, res) => {
//     res.send("Hello")
//     });

//   const authClient = new AuthenticatedClient.Client({ clientId, clientSecret });





const redirectUri = 'http://localhost:5001/auth';
// Endpoint to initiate the login process
app.get('/login/:organizationId', (req, res) => {
  const organizationId = req.params.organizationId;
  //save in ls
  // localStorage.setItem('myKey', 'myValue');
  // localStorage.setItem('organizationId', organizationId);

  res.cookie('organizationId', organizationId, { httpOnly: true });
  const encodedOrganizationId = encodeURIComponent(organizationId);

  const scope =
    'tickets%20e-commerce%20settings.users.write%20settings.users.read%20crm.schemas.contacts.read%20settings.billing.write%20crm.schemas.contacts.write%20crm.schemas.deals.read%20crm.schemas.deals.write%20settings.users.teams.write%20settings.users.teams.read%20settings.currencies.read%20settings.currencies.write%20crm.objects.goals.read';

  const authorizationUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`;

  res.redirect(authorizationUrl);

});

app.get(`/test`, async (req, res) => {
  res.json("hello");
});

app.get(`/auth`, async (req, res) => {
  const redirectUrib = 'http://localhost:3000/dash';
  const { code } = req.query;
  // const redirectUri = `http://localhost:5001/oauth-callback?organizationId=${organizationId}`;
  const cookies = cookie.parse(req.headers.cookie || '');
  // const organizationId = localStorage.getItem('organizationId');
  const organizationId = cookies.organizationId;

  const tokenResponse = await authClient.oauth.tokensApi.create(
    'authorization_code',
    code,
    redirectUri,
    clientId,
    clientSecret
  );



  const accessToken = tokenResponse.accessToken;

  const refreshToken = tokenResponse.refreshToken;



  await Authentication.create({
    organizationId,
    accessToken,
    refreshToken
  });

  const hubspotApiResponse = await fetch('https://api.hubspot.com/settings/v3/users');
  const userData = await hubspotApiResponse.json();
  // const userData = await hubspotApiResponse.json();
  const hubspotApiUrl = 'https://api.hubspot.com/settings/v3/users';

  const UserApiResponse = await fetch(hubspotApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const responseData = await UserApiResponse.json();

  const usersData = responseData.results.map((user) => ({
    hubspotUserId: user.id,
    email: user.email,
  }));

  const organisation_id = organizationId;
  const email = usersData[0].email;
  const hub_id = usersData[0].hubspotUserId;

  const user = await User.findOne({ where: { email } });

  if (!user) {
    await User.create({
      organisation_id,
      email,
      hub_id
    });
  }
  // localStorage.removeItem('organizationId');

  res.cookie('myData', accessToken, { httpOnly: true });
  res.cookie('myRefreshToken', refreshToken, { httpOnly: true });


  res.redirect(redirectUrib);

});

app.get(`/refresh_token`, async (req, res) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const accessToken_c = cookies.myData;
  const refreshToken_c = cookies.myRefreshToken;
  const organizationId = cookies.organizationId;

  // const accessToken = localStorage.getItem('myData');
  // const refreshToken = localStorage.getItem('myRefreshToken');
  // const userData = await hubspotApiResponse.json();
  const hubspotApiUrl = 'https://api.hubapi.com/oauth/v1/token';
  const UserApiResponse = await fetch(hubspotApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken_c,
    }),
  });
  const data = await UserApiResponse.json();

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  // const organizationId_new = data.organizationId;

  await Authentication.create({
    organizationId,
    accessToken,
    refreshToken
  });
  res.cookie('myData', accessToken, { httpOnly: true });
  res.cookie('myRefreshToken', refreshToken, { httpOnly: true });

  res.json({ message: 'Token granted successfully' });
});

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('Database synced.');
  })
  .catch((err) => {
    console.log("ME HERE");
    console.error('Error syncing database:', err);
  });


const port = process.env.PORT || 5001;
const start = async () => {
  try {
    await connectDB();
    app.listen(port, console.log(`Server listen on port ${port}...`));
    console.log('Connected to PostgreSQL database.');
  } catch (error) {
    console.log("ME HERE");
    console.error('Error connecting to PostgreSQL:', error);
  }
};


start();
