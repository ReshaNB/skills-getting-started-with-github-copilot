from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities_returns_200_and_structure():
    resp = client.get('/activities')
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # expect at least one activity and each has required keys
    for name, details in data.items():
        assert 'description' in details
        assert 'schedule' in details
        assert 'max_participants' in details
        assert 'participants' in details
        break


def test_signup_and_unregister_flow():
    # choose an activity
    activity_name = 'Chess Club'
    email = 'teststudent@example.com'

    # ensure not already in participants
    if email in activities[activity_name]['participants']:
        activities[activity_name]['participants'].remove(email)

    # signup
    resp = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert resp.status_code == 200
    assert f"Signed up {email}" in resp.json().get('message', '')
    assert email in activities[activity_name]['participants']

    # unregister
    resp2 = client.delete(f"/activities/{activity_name}/participants?email={email}")
    assert resp2.status_code == 200
    assert f"Unregistered {email}" in resp2.json().get('message', '')
    assert email not in activities[activity_name]['participants']
