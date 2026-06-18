import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Button, Box, ButtonGroup, Text, Inline, Spinner, Stack, useProductContext } from '@forge/react';
import { ApproversTable } from './Approvers';
import { ApproversManagers } from './ApproversManager';
import { invoke } from '@forge/bridge';

const VIEWS = {
	TABLE: "table",
	MANAGE: "manage"
}

const App = () => {
	const context = useProductContext()
	const pageId = context?.extension?.content?.id;
    const accountId = context?.accountId;
	const [isFetchingApprovers, setIsFetchingApprovers] = useState(false)
  
    const [activeView, setActiveView] = useState('table');
	const [approvalData, setApprovalData] = useState([])
	const [loggedInAccountId, setLoggedInAccountId] = useState(null)
    const [isPageOwner, setIsPageOwner] = useState(null)
	const [metaData, setMetaData] = useState({ jiraKey: "...", createdAt: "..." })

	useEffect(() => {
		if (!pageId || !accountId) return;
		setLoggedInAccountId(accountId)

		async function loadDataBridgePayload() {
			try {
                const response = await invoke('fetchPageOwner', { pageId, accountId });
                setIsPageOwner(response.isPageOwner); 

				const result = await invoke("fetchApprovers", { clientPageId: pageId })

				if (result?.success && result.mockData) {
                    const payload = result.mockData;

                    // Mapping string statuses to numeric types: 0 = Pending, 1 = Approved, 2 = Rejected
                    const normalizedApprovers = payload.approvers.map(approver => ({
                        id: approver.id,
                        name: approver.name,
                        status: approver.status === "Approved" ? 1 : approver.status === "Rejected" ? 2 : 0 
                    }));

                    setMetaData({
                        jiraKey: payload.jiraKey,
                        createdAt: payload.createdAt
                    });

                    setApprovalData(normalizedApprovers);
                }
			} catch (err) {
                console.error("Data bridge exchange failed:", err);
            } finally {
                setIsFetchingApprovers(false);
            }
		}

		loadDataBridgePayload()
	}, [pageId, accountId])

    if (isPageOwner === null) {
        return (
            <Box>
                <Spinner size="medium" label='Validating page ownership...' />
            </Box>
        );
    }

    return (
        <Stack space='space.200'>
            <ButtonGroup>
				<Button 
                    appearance={activeView === 'table' ? 'primary' : 'default'} 
                    onClick={() => setActiveView(VIEWS.TABLE)}
                >
                    View Approvers
                </Button>
                
                <Button 
                    appearance={activeView === 'manage' ? 'primary' : 'default'} 
                    onClick={() => setActiveView(VIEWS.MANAGE)}
                    isDisabled={!isPageOwner}
                >
                    Manage Approvers
                </Button>
			</ButtonGroup>
            { isFetchingApprovers && 
				<Box>
					<Spinner size="small" label='Fetching document approvers.'></Spinner>
				</Box>
			}
            {activeView === VIEWS.TABLE && 
				<ApproversTable data={approvalData} />
			}
            {activeView === 'manage' && 
				<ApproversManagers 
					onCancel={() => setActiveView('table')} 
					existingConfig={approvalData}
				/>
			}
        </Stack>
    );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);