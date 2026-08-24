# CMB Networks - Azure Deployment Instructions

## Files in this package:
- index.html — main website with AI chatbot
- internetConsultantBGW.jpg — hero background image
- CMBLogo.png — color logo
- CMBLogoWhite.png — white logo
- staticwebapp.config.json — Azure config
- api/chat.js — chatbot API function (runs serverless)
- api/package.json — API dependencies

## Deployment Steps:

### 1. Create Azure Static Web App
1. Go to portal.azure.com
2. Create a resource → Static Web App
3. Choose Free tier
4. Connect to GitHub (create a repo, upload these files)
5. Azure auto-deploys on every push

### 2. Set your API Key
1. In Azure Portal go to your Static Web App
2. Configuration → Application Settings
3. Add: ANTHROPIC_API_KEY = your key from console.anthropic.com

### 3. Point GoDaddy to Azure
1. In Azure Portal find your Static Web App URL (something like xxx.azurestaticapps.net)
2. In Static Web App → Custom Domains → Add cmbnetworks.net
3. Azure gives you a CNAME value to add in GoDaddy
4. In GoDaddy DNS → Add CNAME record with that value
5. Wait 30-60 minutes for propagation

### 4. Test the chatbot
Visit cmbnetworks.net and click the green chat button in the bottom right corner.
