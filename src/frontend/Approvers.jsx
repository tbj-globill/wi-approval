import React, { useEffect, useState } from "react"
import { 
  DynamicTable, 
  Spinner, 
  Text, 
  Box, 
  Stack, 
  Button, 
  ButtonGroup,
  Heading,
  Lozenge, 
  Inline, 
  useProductContext 
} from "@forge/react"
import { invoke } from "@forge/bridge"

const head = {
    cells: [
        { key: "name", content: "Name", isSortable: false },
        { key: "status", content: "Status", isSortable: false, width: 20 },
        { key: "action", content: "Action", isSortable: false, width: 20 },
    ]
}

export const ApproversTable = ({ data }) => {
    const context = useProductContext();
    const pageId = context?.extension?.content?.id;
    const accountId = context?.accountId;

    // const [data, setData] = useState([]);
    const [loggedInAccountId, setLoggedInAccountId] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [metaData, setMetaData] = useState({ jiraKey: "...", createdAt: "..." })

    // useEffect(() => {
    //     if (!pageId || !accountId) return;

    //     setLoggedInAccountId(accountId);

    //     async function loadDataBridgePayload() {
    //         try {
    //             const result = await invoke("fetchApprovers", { clientPageId: pageId });

    //             if (result?.success && result.mockData) {
    //                 const payload = result.mockData;

    //                 // Mapping string statuses to numeric types: 0 = Pending, 1 = Approved, 2 = Rejected
    //                 const normalizedApprovers = payload.approvers.map(approver => ({
    //                     id: approver.id,
    //                     name: approver.name,
    //                     status: approver.status === "Approved" ? 1 : approver.status === "Rejected" ? 2 : 0 
    //                 }));

    //                 setMetaData({
    //                     jiraKey: payload.jiraKey,
    //                     createdAt: payload.createdAt
    //                 });

    //                 setData(normalizedApprovers);
    //             }
    //         } catch (err) {
    //             console.error("Data bridge exchange failed:", err);
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     }

    //     loadDataBridgePayload();
    // }, [pageId, accountId]);

    const handleApprove = async (id, status) => {
        // 1. Optimistically update the UI to Approved (1)
        console.log('📡 [Frontend] Invoking handleUserApproval with:', metaData.jiraKey, id);
        
        try {
            const result = await invoke("handleUserApproval", {
                parentKey: metaData.jiraKey,
                accountId: id,
                pageId: pageId,
                status
            });

            setData(prev => prev.map(user => user.id === id ? { ...user, status: 1 } : user));
            console.log('✅ [Frontend] Backend response received:', result);
        } catch (error) {
            // This will display explicitly in your browser console if the link breaks
            console.error('💥 [Frontend] Invoke failed to reach the backend:', error);
        }
    };

    const handleReject = async (id) => {
        // Optimistically update the UI to Rejected (2)
        setData(prev => prev.map(user => user.id === id ? { ...user, status: 2 } : user));
        console.log('Rejected by:', id);
    };

    // Helper to render native Atlassian design tags for status columns
    const renderStatusLozenge = (status) => {
        switch (status) {
            case 1:
                return <Lozenge appearance="success">Approved</Lozenge>;
            case 2:
                return <Lozenge appearance="removed">Rejected</Lozenge>;
            default:
                return <Lozenge appearance="moved">Pending</Lozenge>;
        }
    };

    if (isLoading) {
        return <Spinner label="Populating table deliverables..."/>
    }

    // Modern Inline Row Mapping (Replacing the createRows utility file)
    const rows = data.map((user) => {
        // Validation check: Is this specific row tracking the person currently logged in?
        const isCurrentUser = user.id === loggedInAccountId;

        return {
            key: user.id,
            cells: [
                { content: <Text>{user.name} {isCurrentUser && "(You)"}</Text> },
                { content: renderStatusLozenge(user.status) },
                {
                    content: user.status === 0 ? (
                        <ButtonGroup>
                            <Button
                                appearance="subtle"
                                iconBefore="check"
                                onClick={() => handleApprove(user.id, "Approved")}
                                aria-label="Approve"
                                // Optional UX: gray out or disable action controls if it's not their turn
                                isDisabled={!isCurrentUser} 
                            />
                            <Button
                                appearance="subtle"
                                iconBefore="cross"
                                onClick={() => handleReject(user.id, "Rejected")}
                                aria-label="Reject"
                                isDisabled={!isCurrentUser}
                            />
                        </ButtonGroup>
                    ) : (
                        <Text appearance="subtle">&nbsp;</Text>
                    )
                }
            ]
        };
    });

    return (
        <Stack space="space.200">
            <Box>
                <Inline justifyContent="space-between" alignItems="baseline">
                    <Heading size="small">Approvers for Work Instructions in {metaData.jiraKey}</Heading>
                </Inline>
            </Box>

            <DynamicTable head={head} rows={rows} />
            
            <Text size="small" appearance="subtle">Created: {metaData.createdAt}</Text>
        </Stack>
    )
}