type AccountCredentialsFieldsProps = {
  username: string;
  password: string;
  creating: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function AccountCredentialsFields({
  username,
  password,
  creating,
  onUsernameChange,
  onPasswordChange,
}: AccountCredentialsFieldsProps) {
  return (
    <fieldset className="credentials-fields">
      <legend>Account Credentials</legend>
      <label className="field" htmlFor="account-username">
        <span>Username</span>
        <input
          id="account-username"
          autoComplete="username"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          placeholder={creating ? 'Ex: maria.souza' : 'Deixe vazio para manter'}
          required={creating}
          minLength={3}
          maxLength={100}
        />
      </label>
      <label className="field" htmlFor="account-password">
        <span>Password</span>
        <input
          id="account-password"
          type="password"
          autoComplete={creating ? 'new-password' : 'new-password'}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={creating ? 'Mínimo de 8 caracteres' : 'Deixe vazio para manter'}
          required={creating}
          minLength={8}
          maxLength={128}
        />
      </label>
    </fieldset>
  );
}