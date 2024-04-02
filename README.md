# YouTube Video Metadata Updater

This web application allows you to update the metadata (title, description, and language translations) of a YouTube video using the YouTube Data API and Google Cloud Translation API.

## Prerequisites

Node.js installed on your machine.
A Google Cloud Platform (GCP) account.
A YouTube video to update.

## Setup Instructions

1. Clone the Repository
   Clone this repository to your local machine:
   ``bash
   git clone https://github.com/MartinPascale/youtube-translator.git
   cd youtube-translator

2. Install Dependencies
   Install the necessary Node.js dependencies:

``bash
npm install

3. Create a Google Cloud Platform Project

Go to the Google Cloud Console.
Click on "Select a project" at the top, then click on "New Project".
Enter a project name and select a billing account (if required).
Click "Create".

4. Enable APIs

In the Google Cloud Console, select your newly created project.
Navigate to "APIs & Services" > "Dashboard".
Click on "ENABLE APIS AND SERVICES".
Search for "YouTube Data API v3" and enable it.
Search for "Cloud Translation API" and enable it.

5. Create OAuth 2.0 Credentials

Go to "APIs & Services" > "Credentials".
Click on "Create Credentials" > "OAuth client ID".
Select "Web application" as the application type.
Add "http://localhost:3000" to "Authorized JavaScript origins".
Add "http://localhost:3000/oauth2callback" to "Authorized redirect URIs".
Click "Create".
Note down the "Client ID" and "Client secret".

6. Set Environment Variables
   Create a .env file in the root of the project and add the following (replace the placeholders with your actual values):

``bash
Copy code
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:3000/oauth2callback
PROJECT_ID=your-project-id
You can find your project ID in the Google Cloud Console dashboard.

7. Run the Application
   Start the application by running:

``bash
Copy code
node app.js
Navigate to http://localhost:3000 in your browser. You should see the login page. Log in with your Google account that has access to the YouTube video you want to update.

8. Update Video Metadata
   Once logged in, fill in the form with the video ID (found in the YouTube video URL), the language codes for translations (comma-separated, e.g., "es,fr,de"), and the new title and description. Submit the form to update the video metadata.

## Notes

Ensure that the YouTube account you use has permission to edit the video metadata.
The language codes should be in BCP-47 format.
You can add more language translations by adding more language codes separated by commas.
License
This project is licensed under the MIT License - see the LICENSE file for details.
