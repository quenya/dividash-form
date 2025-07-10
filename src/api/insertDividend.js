export default async function insertDividend(data) {
  const response = await fetch(process.env.REACT_APP_API_URL + '/dividends', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}
