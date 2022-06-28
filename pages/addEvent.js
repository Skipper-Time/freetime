const addEvent = (token, userEmail, calData) => {
  console.log(calData, token);
  const { summary, description, location, colorId, start, end } = calData;

  let url = `https://www.googleapis.com/calendar/v3/calendars/${userEmail}/events`;

  let headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }

  fetch(url, {headers: headers, body: JSON.stringify(calData), method: 'POST'})
    .then(res => console.log(res))
    .catch(err => console.log(err));
}


const handleSubmit = (e) => {
  e.preventDefault();
  console.log(summary, description, location, startDateTime, endDateTime);
  console.log('2022-06-27T16:40:00-07:00', new Date(startDateTime).toISOString());

  let body = {
    'summary': summary,
    'location': location,
    'description': description,
    'start': {
      'dateTime': new Date(startDateTime).toISOString(),
    },
    'end': {
      'dateTime': new Date(endDateTime).toISOString(),
    },
  };

  addEvent(token, 'bowersaaronjames@gmail.com', body);
}

<form onSubmit={handleSubmit}>
  <label htmlFor='summary'>Summary</label>
  <br />
  <input
    type='text'
    id='description'
    value={summary}
    onChange={e => setSummary(e.target.value)}
  />
  <br />
  <label htmlFor='description'>Description</label>
  <br />
  <textarea
    id='description'
    value={description}
    onChange={e => setDescription(e.target.value)}
  />
  <br />
  <label htmlFor='location'>Location</label>
  <br />
  <input
    type='text'
    id='location'
    value={location}
    onChange={e => setLocation(e.target.value)}
  />
  <br />
  <label htmlFor='startDateTime'>Start Date Time</label>
  <br />
  <input
    type='datetime-local'
    id='startDateTime'
    value={startDateTime}
    onChange={e => setStartDateTime(e.target.value)}
  />
  <br />
  <label htmlFor='endDateTime'>End Date Time</label>
  <br />
  <input
    type='datetime-local'
    id='endDateTime'
    value={endDateTime}
    onChange={e => setEndDateTime(e.target.value)}
  />
  <br />
  <button type='submit'>create event</button>
</form>