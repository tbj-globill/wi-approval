import React from "react";
import { Button } from "@forge/react";

export const createRows = ({
	data = [],
	onApprove,
	onReject,
	accountId
}) => {
	if (!Array.isArray(data)) {
		console.warn("createRows expected `data` to be an array but received:", typeof data)
		return []
	}

	if (accountId === null || accountId === undefined) {
		throw new Error("Create another one.")
		return
	}

	return data.map((item) => ({
		key: `row-${item.id}`,
		cells: [
			{
				key: item.name,
				content: item.name,
			},
			{
				key: item.status,
				content:
				item.status === 0
					? "Pending"
					: item.status === 1
					? "Approved"
					: "Declined",
			},
			{
				key: item.id,
				content: item.id == accountId ? (
				<>
					<Button
						compact
						appearance="primary"
						onClick={() => onApprove(item.id)}
					>
						Approve
					</Button>

					{" "}

					<Button
						compact
						appearance="danger"
						onClick={() => onReject(item.id)}
					>
						Reject
					</Button>
				</>
				) : ( " " ),
			},
		],
	}));
};