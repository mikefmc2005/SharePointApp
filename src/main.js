/**
 * Main application entry point
 * Initializes Vue app with Quasar UI framework and SharePoint integration
 */

// Import SharePoint authentication utilities
import { loadAccessToken, loadRequestDigest } from "./utils/axiosRequest.js";

// Vue and UI framework imports
import { createApp } from 'vue'
import { Quasar, Notify } from 'quasar'
import quasarLang from 'quasar/lang/en-US'
import { createPinia } from 'pinia'

// Application imports
import router from './routes/router.js'
import App from './App.vue'

// Syncfusion license registration
import { registerLicense } from '@syncfusion/ej2-base';

// Quasar CSS imports
import '@quasar/extras/material-icons/material-icons.css'
import '@quasar/extras/material-icons-outlined/material-icons-outlined.css'
import '@quasar/extras/material-icons-round/material-icons-round.css'
import '@quasar/extras/material-icons-sharp/material-icons-sharp.css'

// Animation CSS imports
import '@quasar/extras/animate/fadeIn.css'
import '@quasar/extras/animate/fadeOut.css'

// Quasar and custom styles
import 'quasar/src/css/index.sass'
import './assets/styles/css/styles.css'

// Initialize Pinia store
const pinia = createPinia();

// Create Vue application instance
const app = createApp(App);

// Configure app plugins
app.use(pinia);

/**
 * Initialize SharePoint authentication and request digest
 * Required for all SharePoint API calls
 */
const initializeApp = async () => {
  try {
    await loadAccessToken();
    await loadRequestDigest();
  } catch (err) {
    console.error('Failed to initialize SharePoint authentication:', err);
    document.write(`<h1>😕 Ooops! <i style="font-size: 20px;">${err}</i></h1>`);
    window.stop();
  }
}

// Initialize app before mounting
await initializeApp();

// Configure Quasar with plugins and language
app.use(Quasar, {
  plugins: {
    Notify
  },
  lang: quasarLang,
});

// Mount application
app.use(router);
app.mount('#app');

// Register Syncfusion license for chart components
registerLicense("ORg4AjUWIQA/Gnt3VVhhQlJDfVddXGBWfFN0QHNYf1R0c19HZEwgOX1dQl9mSXlSckRiWH9ed3FcQ2dXUkQ=")
