const { google } = require('googleapis');
const { TranslationServiceClient } = require('@google-cloud/translate');
const { OAuth2Client } = require('google-auth-library');

const ACCESS_TOKEN = '';
const CLIENT_ID =
  '918763158007-a7mn76u4ei50evh3nt3nvsojlnoummst.apps.googleusercontent.com';
const CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
const PROJECT_ID = 'youtubeuploader-418912';

process.env.GOOGLE_APPLICATION_CREDENTIALS = '';

// Configure OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

// Set the access token (you'll need to obtain this through the OAuth2 flow)
oauth2Client.setCredentials({ access_token: ACCESS_TOKEN });

// Initialize the YouTube and Translate APIs
const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

// Function to upload a video and add translations
async function uploadVideoWithTranslations(
  title,
  description,
  languageCodes,
  videoId,
) {
  console.log('Uploading the video...');

  const videoId = 'SqHu58sn5uU';

  console.log('Video uploaded:', videoId);

  // Function to get video metadata
  async function getVideoMetadata(videoId) {
    const videoResponse = await youtube.videos.list({
      part: 'snippet',
      id: videoId,
    });

    console.log(videoResponse);

    return videoResponse.data.items?.[0]?.snippet || null;
  }

  // Google Cloud Translation function
  async function translateText(text, targetLanguage) {
    try {
      const authClient = new OAuth2Client();
      authClient.setCredentials({
        access_token: ACCESS_TOKEN,
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

  async function updateVideoMetadataWithTranslations(videoId, targetLanguages) {
    console.log('Updating video metadata with translations...');
    const videoSnippet = await getVideoMetadata(videoId);
    if (!videoSnippet) {
      console.error('Video snippet not found');
      return;
    }

    console.log('video ', videoSnippet);

    const videoLocalizations = videoSnippet.localizations || {};

    for (const langCode of targetLanguages) {
      const translatedTitle = await translateText(videoSnippet.title, langCode);
      const translatedDescription = await translateText(
        videoSnippet.description,
        langCode,
      );

      console.log(translatedTitle, translatedDescription);

      videoLocalizations[langCode] = {
        title: translatedTitle,
        description: translatedDescription,
      };
    }

    const updateRequest = await youtube.videos.update({
      part: 'snippet,localizations',
      requestBody: {
        id: videoId,
        snippet: {
          title: videoSnippet.title,
          description: videoSnippet.description,
          categoryId: videoSnippet.categoryId,
          defaultLanguage: 'en', // Specify the default language of the original title and description
        },
        localizations: videoLocalizations,
      },
    });

    console.log(updateRequest.data);
  }

  updateVideoMetadataWithTranslations(videoId, languageCodes);

  console.log(
    `Video uploaded and translations added: https://www.youtube.com/watch?v=${videoId}`,
  );
}

// Example usage
uploadVideoWithTranslations(
  'My Awesome Video',
  'This is a description of my awesome video.',
  ['es', 'fr', 'de'], // Translate to Spanish, French, and German
  'videoId',
).catch(console.error);
