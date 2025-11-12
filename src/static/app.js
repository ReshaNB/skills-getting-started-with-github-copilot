document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to create a participant list item with delete handler
  function createParticipantListItem(activityCard, activityName, email) {
    const li = document.createElement('li');
    li.className = 'participant-item';

    const span = document.createElement('span');
    span.className = 'participant-email';
    span.textContent = email;

    const btn = document.createElement('button');
    btn.className = 'delete-participant';
    btn.type = 'button';
    btn.title = `Unregister ${email}`;
    btn.setAttribute('data-activity', activityName);
    btn.setAttribute('data-email', email);
    btn.innerHTML = '&times;';

    btn.addEventListener('click', async (evt) => {
      evt.preventDefault();
      btn.disabled = true;
      try {
        const activityEncoded = encodeURIComponent(activityName);
        const emailEncoded = encodeURIComponent(email);
        const res = await fetch(`/activities/${activityEncoded}/participants?email=${emailEncoded}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          // remove the list item
          li.remove();

          // update counts and spots left
          const countEl = activityCard.querySelector('.participants-count');
          const spotsEl = activityCard.querySelector('.spots-left');
          const newCount = Math.max(0, parseInt(countEl.textContent || '0', 10) - 1);
          countEl.textContent = newCount;
          const newSpots = parseInt(spotsEl.textContent || '0', 10) + 1;
          spotsEl.textContent = newSpots;

          // if list became empty, show empty hint
          const ul = activityCard.querySelector('.participants-list');
          if (!ul || ul.children.length === 0) {
            if (ul) ul.remove();
            const participantsContainer = activityCard.querySelector('.participants-container');
            const emptyP2 = document.createElement('p');
            emptyP2.className = 'participants-empty';
            emptyP2.textContent = 'No participants yet';
            participantsContainer.appendChild(emptyP2);
          }
        } else {
          const data = await res.json().catch(() => ({}));
          console.error('Failed to unregister:', data.detail || data.message || res.statusText);
          btn.disabled = false;
        }
      } catch (err) {
        console.error('Error unregistering participant:', err);
        btn.disabled = false;
      }
    });

    li.appendChild(span);
    li.appendChild(btn);
    return li;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        // mark the card so we can find it later when updating UI after signup
        activityCard.setAttribute('data-activity', name);

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants DOM: list (hidden bullets) with delete icon per participant, or an empty hint
          const participants = details.participants || [];

          activityCard.innerHTML = `
            <h4>${name}</h4>
            <p>${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
            <div class="participants-section">
              <strong>Participants (<span class="participants-count">${participants.length}</span>):</strong>
              <div class="participants-container"></div>
            </div>
          `;

          // Append card and then populate participants container with accessible buttons
          activitiesList.appendChild(activityCard);

          const participantsContainer = activityCard.querySelector('.participants-container');

          if (participants.length === 0) {
            const emptyP = document.createElement('p');
            emptyP.className = 'participants-empty';
            emptyP.textContent = 'No participants yet';
            participantsContainer.appendChild(emptyP);
          } else {
            const ul = document.createElement('ul');
            ul.className = 'participants-list';

            participants.forEach((p) => {
              const li = createParticipantListItem(activityCard, name, p);
              ul.appendChild(li);
            });

            participantsContainer.appendChild(ul);
          }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Update the UI so the newly signed-up participant appears without a page reload
        try {
          const activityName = activity;
          // find card by data attribute or fallback to h4 text match
          const card = Array.from(document.querySelectorAll('.activity-card')).find(c => {
            return c.getAttribute('data-activity') === activityName || c.querySelector('h4')?.textContent.trim() === activityName;
          });

          if (card) {
            const participantsContainer = card.querySelector('.participants-container');
            let ul = participantsContainer.querySelector('.participants-list');

            // If there was an empty message, remove it and create the list
            const empty = participantsContainer.querySelector('.participants-empty');
            if (!ul) {
              if (empty) empty.remove();
              ul = document.createElement('ul');
              ul.className = 'participants-list';
              participantsContainer.appendChild(ul);
            }

            // create and append the new participant list item
            const li = createParticipantListItem(card, activityName, email);
            ul.appendChild(li);

            // update counts and spots
            const countEl = card.querySelector('.participants-count');
            const spotsEl = card.querySelector('.spots-left');
            countEl.textContent = (parseInt(countEl.textContent || '0', 10) + 1).toString();
            spotsEl.textContent = Math.max(0, parseInt(spotsEl.textContent || '0', 10) - 1).toString();
          }
        } catch (err) {
          console.error('Error updating UI after signup:', err);
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
