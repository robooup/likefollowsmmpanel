'use client';

import CarbonSignInForm from './sign-in-form';

export default function CarbonSignInPage() {
  return (
    <div className="cb-auth">
      <div className="cb-card cb-auth-card">
        <h1 className="cb-card-title">Sign in</h1>
        <CarbonSignInForm />
      </div>
    </div>
  );
}
