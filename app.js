const express = require('express');
const { google } = require('googleapis');
const { TranslationServiceClient } = require('@google-cloud/translate');
const OAuth2Client = google.auth.OAuth2;

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const CLIENT_ID =
  '918763158007-a7mn76u4ei50evh3nt3nvsojlnoummst.apps.googleusercontent.com';
const CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/cloud-translation',
];
const PROJECT_ID = 'youtubeuploader-418912';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.get('/', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.render('index', { url });
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  res.redirect('/form');
});

app.get('/form', (req, res) => {
  res.render('form');
});

app.post('/submit', async (req, res) => {
  const { videoId, languageCodes, title, description } = req.body;
  const languageArray = languageCodes.split(',').map((code) => code.trim());
  const accessToken = oauth2Client.credentials.access_token;

  try {
    await updateVideoMetadataWithTranslations(
      videoId,
      languageArray,
      title,
      description,
      accessToken,
    );
    res.send('Video metadata updated successfully!');
  } catch (error) {
    console.error(error);
    res.send('Failed to update video metadata.');
  }
});

async function updateVideoMetadataWithTranslations(
  videoId,
  languageCodes,
  title,
  description,
  accessToken,
) {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const videoLocalizations = {};

  console.log('Updating video metadata with translations...');
  console.log('videoId ', videoId);
  console.log('languageCodes ', languageCodes);
  console.log('title ', title);
  console.log('description ', description);

  for (const langCode of languageCodes) {
    const translatedTitle = await translateText(title, langCode, accessToken);
    const translatedDescription = await translateText(
      description,
      langCode,
      accessToken,
    );

    // Ensure that the title and description are not empty
    if (translatedTitle && translatedDescription) {
      console.log(`Language code: ${langCode}`);
      console.log(`Translated title: ${translatedTitle}`);
      console.log(`Translated description: ${translatedDescription}`);

      videoLocalizations[langCode] = {
        title: translatedTitle,
        description: translatedDescription,
      };
    }
  }

  // Ensure that there's at least one localization before making the update request
  if (Object.keys(videoLocalizations).length > 0) {
    await youtube.videos.update({
      part: 'localizations',
      requestBody: {
        id: videoId,
        localizations: videoLocalizations,
      },
    });
  } else {
    throw new Error('No valid localizations to update.');
  }
}

async function translateText(text, targetLanguage, accessToken) {
  try {
    const authClient = new OAuth2Client();
    authClient.setCredentials({
      access_token: accessToken,
      scope: 'https://www.googleapis.com/auth/cloud-translation',
    });

    const translationClient = new TranslationServiceClient({
      projectId: PROJECT_ID,
      authClient,
    });

    const [translation] = await translationClient.translateText({
      parent: `projects/${PROJECT_ID}/locations/global`,
      contents: [text],
      targetLanguageCode: targetLanguage,
    });

    return translation.translations[0].translatedText || '';
  } catch (error) {
    console.error(error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
