const express = require('express');
const axios = require('axios');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN;
const REDIRECT_URI = 'http://localhost:3000';

app.use(express.json());
app.use(cors());

app.post('/authenticate', async (req, res) => {
  try {
    const { code } = req.body;

    // Cognito 토큰 엔드포인트에 요청
    const tokenResponse = await axios.post(
      `${COGNITO_DOMAIN}/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: COGNITO_CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { id_token } = tokenResponse.data;

    console.log('id_token', id_token);

    // ID 토큰 디코딩하여 사용자 정보 추출
    const base64Url = id_token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString()
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    console.log('jsonPayload', jsonPayload);

    const userInfo = JSON.parse(jsonPayload);

    console.log('userInfo', userInfo);

    const userId = userInfo.sub;
    const userEmail = userInfo.email;
    // 외부 인증 제공자 정보 확인
    const issuer = userInfo.iss; // 발급자 정보 확인
    let externalProvider = null;

    // 'identities' 필드가 있는 경우, 외부 인증 제공자 정보 추출
    if (userInfo.identities) {
      const identities = userInfo.identities;
      if (Array.isArray(identities) && identities.length > 0) {
        externalProvider = identities[0].providerName; // 첫 번째 인증 제공자 이름 사용
      }
    }

    console.log('Issuer:', issuer);
    console.log('External Provider:', externalProvider);
    console.log('userId', userId);
    console.log('userEmail', userEmail);

    res.json({ message: 'User authenticated', email: userEmail });
  } catch (error) {
    console.error('Error in authentication:', error.message, error.response.data);
    res.status(500).send('Authentication failed');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
