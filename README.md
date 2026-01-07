# n8n YouTube & Gmail Automation

This project provides an automated way to upload `.mp4` video files to YouTube and send a confirmation email via Gmail using [n8n](https://n8n.io/).

## Prerequisite

- Docker and Docker Compose installed.
- Google Cloud Platform account with YouTube Data API v3 and Gmail API enabled.

## Setup Instructions

### 1. Start n8n
```bash
docker-compose up -d
```
Access n8n at `http://localhost:5678`.

### 2. Configure Google Cloud Credentials
You need OAuth2 credentials for both YouTube and Gmail.
- Go to [Google Cloud Console](https://console.cloud.google.com/).
- Create a project.
- Enable `YouTube Data API v3` and `Gmail API`.
- Configure the OAuth Consent Screen (External/Internal).
- Create OAuth 2.0 Client IDs (Web application).
- Add `http://localhost:5678/rest/oauth2-credential/callback` as an Authorized Redirect URI.

### 3. Import Workflow
- Open n8n (`http://localhost:5678`).
- Go to **Workflows** -> **Import from File**.
- Select `youtube_upload_workflow.json`.

### 4. Setup Credentials in n8n
- In the workflow, click on the **YouTube Upload** node.
- Create a new credential and paste your Client ID and Client Secret.
- Repeat the same for the **Gmail Notification** node.

### 5. Run the Automation
- Place your `.mp4` files in the `videos/` folder within this repository.
- Run the workflow manually or set a **Schedule Trigger**.

## File Structure
- `docker-compose.yml`: Docker configuration for n8n.
- `youtube_upload_workflow.json`: The automation workflow.
- `videos/`: Place your video files here.
