const express = require('express');
const { google } = require('googleapis');
const { TranslationServiceClient } = require('@google-cloud/translate');
const bodyParser = require('body-parser');

const oauthCredentials = require('./oauthCredentials.json');

const CLIENT_ID = oauthCredentials.web.client_id;
const CLIENT_SECRET = oauthCredentials.web.client_secret;
const REDIRECT_URI = oauthCredentials.web.redirect_uris[0];

// Set up Google OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

let targetLanguages = [
  'en-US',
  'es-ES',
  'fr-FR',
  'pt-BR',
  'de-DE',
  'ja-JP',
  'ko-KR',
  'ru-RU',
  'zh-CN',
  'zh-TW',
];

// Google Cloud Translation function
function translateText(text, targetLanguage) {
  const translationClient = new TranslationServiceClient();
  return translationClient
    .translateText({
      parent: `projects/youtube-translator-410022/locations/global`,
      contents: [text],
      targetLanguageCode: targetLanguage,
    })
    .then((translation) => {
      console.log(translation.translations[0].translatedText);
      return translation.translations[0].translatedText || '';
    })
    .catch((err) => {
      console.error(err);
      throw `Translation error: ${err}`;
    });
}

// Function to get video metadata
function getVideoMetadata(videoId) {
  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });

  return youtube.videos
    .list({
      part: 'snippet',
      id: videoId,
    })
    .then((response) => {
      const videoSnippet = response.data.items[0].snippet;
      console.log('=====================================');
      console.log('Snippet', response.data.items[0].snippet);
      return videoSnippet; // Return the snippet from within the .then() block
    })
    .catch((err) => {
      console.log('Error getting video metadata');
      console.error(err);
      throw err; // Propagate the error if needed
    });
}

function updateVideoMetadataWithTranslations(videoId, targetLanguages) {
  getVideoMetadata(videoId)
    .then((response) => {
      console.log('===================================== Response');
      console.log(response);
      if (!response) {
        console.error('Video snippet not found');
        return Promise.reject('Video snippet not found');
      }

      const videoSnippet = response; // Assuming this is your video snippet

      const translationPromises = targetLanguages.map((langCode) => {
        return Promise.all([
          translateText(videoSnippet.title, langCode),
          translateText(videoSnippet.description, langCode),
        ]).then(([translatedTitle, translatedDescription]) => {
          return {
            langCode,
            translatedTitle,
            translatedDescription,
          };
        });
      });

      return Promise.all(translationPromises).then((translations) => {
        const videoLocalizations = videoSnippet.localizations || {};

        translations.forEach((translation) => {
          const { langCode, translatedTitle, translatedDescription } =
            translation;
          videoLocalizations[langCode] = {
            title: translatedTitle,
            description: translatedDescription,
          };
        });

        videoSnippet.localizations = videoLocalizations;

        console.log(
          '===================================== Video Localizations',
        );
        console.log(videoSnippet.localizations);

        const youtube = google.youtube({
          version: 'v3',
          auth: oauth2Client,
        });

        return youtube.videos.update({
          part: 'snippet',
          requestBody: {
            id: videoId,
            snippet: videoSnippet,
          },
        });
      });
    })
    .then((response) => {
      console.log(response.data);
      return response.data;
    })
    .catch((err) => {
      console.error(err);
      throw `Error updating metadata ${err}`;
    });
}

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

let authed = false;

const scopes =
  'https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/cloud-translation';

app.get('/', (req, res) => {
  console.log(authed);

  if (!authed) {
    // Generate an OAuth URL and redirect there
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
    console.log(url);
    console.log(authed);

    res.render('index', { url });
  } else {
    // User is authenticated, render the protected page
    const oauth2 = google.oauth2({
      version: 'v2',
      auth: oauth2Client,
    });

    oauth2.userinfo.get((err, response) => {
      if (err) throw err;

      console.log(response.data);
      const name = response.data.name;
      const picture = response.data.picture;

      res.render('success', { name: name, picture: picture });
    });
  }
});

// Redirect user to Google consent screen
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  res.redirect(authUrl);
});

// Handle callback after user grants permission
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;

  if (code) {
    oauth2Client.getToken(code, (err, tokens) => {
      if (err) throw err;

      console.log('Successfully authenticated');
      oauth2Client.setCredentials(tokens);

      authed = true;

      res.redirect('/');
    });
  }
});

// Function to update video metadata
app.post('/updateVideo', async (req, res) => {
  console.log(req.body);
  try {
    // Call function with user input and OAuth2 credentials
    updateVideoMetadataWithTranslations(req.body.videoId, targetLanguages)
      .then((response) => {
        res.send('Video metadata updated');
      })
      .catch((err) => {
        console.error(err);
      });
  } catch (error) {
    console.error('Error updating video metadata:', error);
    res.status(500).send('Error up dating video metadata');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
