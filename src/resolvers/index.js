import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";

const resolver = new Resolver();

resolver.define("handleUserApproval", async(req) => {
    try {
        const { parentKey, accountId, pageId, status } = req.payload

        const externalApiUrl = `https://globe-api-staging-121809622543.asia-east1.run.app/public/forge/wi-aproval/trigger-approval/${pageId}`
        const apiPayload = {
            accountId: accountId,
            status: status // "Approved" or "Rejected"
        };

        const response = await api.fetch(externalApiUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: apiPayload ? JSON.stringify(apiPayload) : null
        })

        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

resolver.define('verifyJiraTicket', async (req) => {
    const { ticketKey } = req.payload;

    if (!ticketKey || !ticketKey.includes('-')) {
        return false;
    }

    try {
        const response = await api.asApp().requestJira(
            route`/rest/api/3/issue/${ticketKey}?fields=summary`
        );

        if (response.status !== 200) {
            throw new Error("Key is invalid. This ticket may not exist within the organization")
        }

        return true
    } catch (error) {
        console.error(error)
        return false
    }
    
    // Your logic here (e.g., Jira REST API fetch)
    // return ticketKey === "TEST-123"; 
});

resolver.define('saveApprovers', async (req) => {
    const payload = req.payload;
    
    // Replace '/api/approvals' with your exact downstream application route if different
    const externalApiUrl = 'https://globe-api-staging-121809622543.asia-east1.run.app/public/forge/wi-approval';

    try {
        console.log('[Forge Backend] Received payload from UI, forwarding to Cloud Run...');

        // Execute the cross-origin secure request out to your service backend
        const response = await api.fetch(externalApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
        },
            body: JSON.stringify(payload)
        });

        // Capture non-2xx status failures from your server immediately
        if (!response.ok) {
            const errorResponseText = await response.text();
            console.error(`[External API Error] Status ${response.status}:`, errorResponseText);
            return { 
                success: false, 
                error: `Server responded with status ${response.status}` 
            };
        }

        console.log('[Forge Backend] External POST Request completed successfully.');
        return { success: true };

    } catch (error) {
        console.error('[Forge Backend Error] Failed to complete external proxy request:', error.message);
        return { success: false, error: error.message };
    }
});

resolver.define('fetchApprovers', async (req) => {
  const { clientPageId } = req.payload;
  
  console.log(`[Data Bridge] Fetching live data from Cloud Run for page: ${clientPageId}`);

  // Construct the absolute path pointing to your controller's GET router matching the page ID
  const externalApiUrl = `https://globe-api-staging-121809622543.asia-east1.run.app/public/forge/wi-approval/${clientPageId}`;

  try {
    const response = await api.fetch(externalApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_SHARED_SECRET_KEY' // Include if your endpoints require token checks
      }
    });

    // Handle 404 (Not Found) cleanly if the page has not been configured in Firestore yet
    if (response.status === 404) {
      console.log(`[Data Bridge] Clean Slate: No layout configuration found for page ${clientPageId}`);
      return {
        success: false,
        message: 'Configuration uninitialized'
      };
    }

    if (!response.ok) {
      throw new Error(`External API responded with status ${response.status}`);
    }

    const result = await response.json();
    console.log('[Data Bridge] Successfully retrieved live database payload from Cloud Run.');

    return {
      success: true,
      echoedPageId: clientPageId,
      // If your Express controller wraps the document inside a "data" key (e.g., { success: true, data: {...} }),
      // use result.data. If it returns the document directly at the root, use result.
      mockData: result.data || result 
    };

  } catch (error) {
    console.error('[Data Bridge Error] Failed to fetch live data stream:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});
resolver.define('fetchPageOwner', async ({ payload }) => {
    const { pageId, accountId } = payload;

    const externalApiUrl = `https://globe-api-staging-121809622543.asia-east1.run.app/public/forge/wi-approval/validate-page-owner/${pageId}/${accountId}`;

    const response = await api.fetch(externalApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })

    const data = await response.json()

    return data
});

export default resolver