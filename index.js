const readline = require('readline');
const { google } = require('googleapis');
const { TranslationServiceClient } = require('@google-cloud/translate');

// Set up Google Application Credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'credentials.json';

// Google Cloud Translation function
async function translateText(text, targetLanguage) {
  const translationClient = new TranslationServiceClient();
  const [translation] = await translationClient.translateText({
    parent: `projects/youtube-translator-410022/locations/global`,
    contents: [text],
    targetLanguageCode: targetLanguage,
  });

  return translation.translations[0].translatedText || '';
}

// Function to get video metadata
async function getVideoMetadata(videoId) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],
  });
  const authClient = await auth.getClient();
  const youtube = google.youtube({
    version: 'v3',
    auth: authClient,
  });

  const videoResponse = await youtube.videos.list({
    part: 'snippet',
    id: videoId,
  });

  return videoResponse.data.items?.[0]?.snippet || null;
}

// Function to update video metadata for a single video with multiple languages
async function updateVideoMetadataWithTranslations(videoId, targetLanguages) {
  const videoSnippet = await getVideoMetadata(videoId);
  if (!videoSnippet) {
    console.error('Video snippet not found');
    return;
  }

  const videoLocalizations = videoSnippet.localizations || {};

  for (const langCode of targetLanguages) {
    const translatedTitle = await translateText(videoSnippet.title, langCode);
    const translatedDescription = await translateText(
      videoSnippet.description,
      langCode,
    );

    videoLocalizations[langCode] = {
      title: translatedTitle,
      description: translatedDescription,
    };
  }

  videoSnippet.localizations = videoLocalizations;

  const auth = new google.auth.GoogleAuth({
    keyFile: '/path/to/client_secret.json',
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],
  });
  const authClient = await auth.getClient();
  const youtube = google.youtube({
    version: 'v3',
    auth: authClient,
  });

  const updateRequest = await youtube.videos.update({
    part: 'snippet',
    requestBody: {
      id: videoId,
      snippet: videoSnippet,
    },
  });

  console.log(updateRequest.data);
}

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt user for videoId and target languages
rl.question('Enter the video ID: ', async (videoId) => {
  rl.question(
    'Enter target languages separated by commas (e.g., en-US,es-ES,fr-FR): ',
    async (languages) => {
      const targetLanguages = languages.split(',').map((lang) => lang.trim());

      // Call function with user input
      await updateVideoMetadataWithTranslations(videoId, targetLanguages);

      // Close the readline interface
      rl.close();
    },
  );
});
