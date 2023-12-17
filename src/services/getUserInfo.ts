export async function getUserInfo(accessToken: string) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const userInfo = await response.json();
    if (!response.ok) throw userInfo;
    console.log(userInfo.name);
    return userInfo;
  } catch (error) {
    throw error;
  }
}
