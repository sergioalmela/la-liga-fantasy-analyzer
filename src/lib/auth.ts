const uuid = "af88bcff-1157-40a0-b579-030728aacf0b";
const urlApi = "https://login.laliga.es/laligadspprob2c.onmicrosoft.com/oauth2/v2.0/token?p=B2C_1A_ResourceOwnerv2";

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
}

export async function getToken(email: string, password: string): Promise<string | null> {
  const data = {
    grant_type: "password",
    client_id: uuid,
    scope: `openid ${uuid} offline_access`,
    redirect_uri: "authredirect://com.lfp.laligafantasy",
    username: email,
    password: password,
    response_type: "id_token",
  };

  try {
    const response = await fetch(urlApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Authentication failed:", errorText);
      return null;
    }

    const jsonResponse = await response.json();
    
    if (!jsonResponse.access_token) {
      console.error("No access token in response");
      return null;
    }

    return jsonResponse.access_token.toString();
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('auth_token', token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('auth_token');
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}