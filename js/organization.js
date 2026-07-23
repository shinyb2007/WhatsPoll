// WhatsPoll Teams Dashboard Controller

class TeamsDashboard {
    constructor() {
        this.sidebarItems = document.querySelectorAll('.teams-sidebar .team-space-item');
        this.spaceTitle = document.getElementById('team-space-title');
        this.spaceDesc = document.getElementById('team-space-desc');
        this.membersCountVal = document.getElementById('team-active-members');
        this.pollsCountVal = document.getElementById('team-shared-polls');
        this.membersTbody = document.getElementById('team-members-tbody');
        
        // Buttons
        this.inviteBtn = document.getElementById('invite-team-members-btn');
        this.newRowBtn = document.getElementById('new-member-row-btn');
        
        this.currentSpaceKey = 'office';

        this.init();
    }

    init() {
        if (!this.spaceTitle) return;
        this.renderWorkspace();
        this.bindEvents();
    }

    bindEvents() {
        // Space changes
        this.sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                this.sidebarItems.forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                
                this.currentSpaceKey = item.dataset.team;
                this.renderWorkspace();
            });
        });

        // Invite simulation
        this.inviteBtn.addEventListener('click', () => {
            const email = prompt("Enter member's email address to invite to this space:");
            if (email && email.includes('@')) {
                alert(`Invite email sent to ${email}. They will appear in the team space once they accept.`);
            } else if (email) {
                alert("Please enter a valid email address.");
            }
        });

        // Insert new member row
        this.newRowBtn.addEventListener('click', () => this.handleAddNewMember());
    }

    async handleAddNewMember() {
        const name = prompt("Enter team member name:");
        if (!name) return;
        const email = prompt("Enter email address:");
        if (!email) return;

        try {
            const res = await fetch('/api/team/member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    space: this.currentSpaceKey,
                    name: name,
                    email: email,
                    role: "Member",
                    permissions: "Vote & Create"
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                window.WhatsPollState = responseData.state;
                this.renderWorkspace();
            }
        } catch (err) {
            console.error("Failed to add new team member on server:", err);
        }
    }

    async handleDeleteMember(email) {
        try {
            const res = await fetch('/api/team/member/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    space: this.currentSpaceKey,
                    email: email
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                window.WhatsPollState = responseData.state;
                this.renderWorkspace();
            }
        } catch (err) {
            console.error("Failed to delete team member from server:", err);
        }
    }

    renderWorkspace() {
        const teams = window.WhatsPollState.teams || {};
        const data = teams[this.currentSpaceKey];
        if (!data) return;

        this.spaceTitle.innerText = data.name;
        this.spaceDesc.innerText = data.desc;
        this.membersCountVal.innerText = data.membersCount;
        this.pollsCountVal.innerText = data.pollsCount;

        // Render table body
        this.membersTbody.innerHTML = "";
        data.members.forEach((m) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td>${m.email}</td>
                <td>
                    <select class="role-select-box">
                        <option value="owner" ${m.role === 'Owner' ? 'selected' : ''}>Owner</option>
                        <option value="admin" ${m.role === 'Admin' ? 'selected' : ''}>Admin</option>
                        <option value="member" ${m.role === 'Member' ? 'selected' : ''}>Member</option>
                        <option value="guest" ${m.role === 'Guest' ? 'selected' : ''}>Guest</option>
                    </select>
                </td>
                <td><span style="font-size:12px; color:var(--text-secondary);">${m.permissions}</span></td>
                <td>
                    <button class="outline-btn delete-member-btn" style="padding:4px 8px; font-size:11px; color:var(--danger); border-color:rgba(239,68,68,0.2);">
                        Remove
                    </button>
                </td>
            `;
            
            // Delete listener
            tr.querySelector('.delete-member-btn').addEventListener('click', () => {
                this.handleDeleteMember(m.email);
            });

            this.membersTbody.appendChild(tr);
        });
    }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
    window.WhatsPollOrganization = new TeamsDashboard();
});
export default TeamsDashboard;
