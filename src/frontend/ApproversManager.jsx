import React, { useState, useEffect } from "react";
import {
  Heading,
  Stack,
  Text,
  Textfield,
  Button,
  ButtonGroup,
  DynamicTable,
  SectionMessage,
  UserPicker, // Imported directly from the native UI Kit library
  Label,
  ValidMessage,
  HelperMessage,
  useProductContext,
  RequiredAsterisk,
  ErrorMessage
} from "@forge/react";
import { invoke } from "@forge/bridge";

export const ApproversManagers = ({ onCancel }) => {
    // 1. Extract context variables
    const context = useProductContext();
    const pageId = context?.extension?.content?.id;
    const siteUrl = context?.siteUrl; // e.g., "https://your-domain.atlassian.net"
    
    // Dynamically build the absolute Confluence page link
    const confluenceLink = pageId && siteUrl ? `${siteUrl}/wiki/pages/${pageId}` : "";
    const [jiraKey, setJiraKey] = useState("");
    const [approverList, setApproverList] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState(null);

  // Debounced Jira Key validation
  useEffect(() => {
        // 1. Clear statuses immediately if the field gets wiped out
        if (!jiraKey || jiraKey.trim().length < 3) {
            setSearchStatus(null);
            setIsSearching(false);
            return;
        }

        // 2. Set up the debounced timer
        const delayDebounceFn = setTimeout(async () => {
            
            // MOVE LOG HERE: This will now only log when the user STOPS typing for 800ms
            console.log('🚀 Debounce triggered! Calling backend for:', jiraKey);
            
            // MOVE STATE HERE: Only trigger the loading spinner when the API call actually begins
            setIsSearching(true); 

            try {
            const isValid = await invoke("verifyJiraTicket", { ticketKey: jiraKey });
            console.log('🎯 Backend validation response:', isValid);
            
            setSearchStatus(isValid ? "success" : "error");
            } catch (error) {
            console.error("Debounce API invocation failed:", error);
            setSearchStatus("error");
            } finally {
            setIsSearching(false);
            }
        }, 800);

        // 3. Clean up the timer if the user types another character before 800ms hits
        return () => clearTimeout(delayDebounceFn);
    }, [jiraKey]);

    // Handle selections from the Atlassian Directory Dropdown
    const handleUserSelect = (user) => {
        if (!user) return;

        // Prevent duplicates by checking their unique Atlassian accountId (user.id)
        if (!approverList.some((item) => item.id === user.id)) {
        setApproverList([
            ...approverList,
            {
                id: user.id,
                name: user.name,
                email: user.email || "Hidden (Privacy Restrictions)"
            }
        ]);
        }
    };

    const handleRemoveApprover = (idToRemove) => {
        setApproverList(approverList.filter((user) => user.id !== idToRemove));
    };

    const handleConfirm = async() => {
        const payload = {
            jiraKey,
            confluencePageId: pageId,
            confluenceLink,
            approvers: approverList, // Pass array of { id, name, email }
        };

        try {
            const response = await invoke("saveApprovers", payload)

            if (response?.success) {
                console.log("✅ Configuration successfully saved to external DB!");
                onCancel(); // Automatically bounce back to the main view table on success
            } else {
                console.error("❌ External API rejected saving layout:", response?.error);
                // Optional: Trigger a local state banner to notify the user of an error
            }
        } catch (error) {
            console.error("💥 Critical error invoking backend resolver:", error);
        }
    };

  const tableHead = {
    cells: [
      { key: "name", content: "Name" },
      { key: "email", content: "Email Address" },
      { key: "actions", content: "Remove", width: 15 },
    ],
  };

  const tableRows = approverList.map((user) => ({
    key: user.id, // Using Atlassian Account ID as the key
    cells: [
      { content: <Text>{user.name}</Text> },
      { content: <Text appearance="subtle">{user.email}</Text> },
      {
        content: (
          <Button
            appearance="subtle"
            iconBefore="cross"
            onClick={() => handleRemoveApprover(user.id)}
            aria-label={`Remove ${user.name}`}
          />
        ),
      },
    ],
  }));

  return (
    <Stack space="space.200">
      <Heading size="medium">Manage Approvers</Heading>
      <Text>Manage your approvers by providing the required information below.</Text>

      {/* Jira Ticket Key Input */}
      <Stack space="space.050">
        <Label>Jira Ticket Key <RequiredAsterisk /></Label>
        <Textfield isRequired
          label="Jira Ticket Key"
          placeholder="e.g., GNG-1234"
          value={jiraKey}
          onChange={(e) => setJiraKey(e.target.value)}
        />
        {isSearching && <HelperMessage>Checking Jira key validity...</HelperMessage>}
        {!isSearching && searchStatus === "success" && (
          <ValidMessage>Jira ticket key successfully verified.</ValidMessage>
        )}
        {!isSearching && searchStatus === "error" && (
          <ErrorMessage>Jira key cannot be verified. Please check your spelling or ensure that it exists within our organization.</ErrorMessage>
        )}
      </Stack>

      {/* Native Atlassian User Picker Component */}
      <UserPicker
        name="approver-picker"
        placeholder="Approver's name or email"
        onChange={handleUserSelect}
      />

      {/* List of Added Approvers */}
      <Stack space="space.100">
        <Heading size="small">Selected Approvers ({approverList.length})</Heading>
        <DynamicTable
          head={tableHead}
          rows={tableRows}
          emptyView={<Text>No approvers selected. Use the search field above to add them.</Text>}
        />
      </Stack>

      {/* Action Controls */}
      <ButtonGroup>
        <Button appearance="danger" onClick={onCancel}
            isDisabled={!jiraKey || approverList.length === 0}
        >
          Cancel
        </Button>
        <Button 
          appearance="primary" 
          onClick={handleConfirm}
          isDisabled={!jiraKey || approverList.length === 0}
        >
          Confirm
        </Button>
      </ButtonGroup>
    </Stack>
  );
};