import { Link } from 'react-router-dom';
import { FooterText } from './FooterText.tsx';

export function Terms() {
    return (
        <main style={{ writingMode: 'horizontal-tb' }}>
            <nav><strong>✔︎ TateTodo</strong></nav>
            <article>
                <h3>Terms of Service</h3>
                <p><small>Last updated: May 2026</small></p>

                <h3>1. Acceptance of Terms</h3>
                <p>By accessing or using TateTodo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

                <h3>2. Use of the Service</h3>
                <p>You may use the Service for personal, non-commercial purposes. You agree not to misuse the Service, including but not limited to: attempting to gain unauthorised access to any part of the Service, transmitting harmful or illegal content, or interfering with other users.</p>

                <h3>3. User Accounts</h3>
                <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorised use.</p>

                <h3>4. User Content</h3>
                <p>You retain ownership of any content you create on the Service. By using the Service you grant us a limited licence to store and transmit your content solely to operate the Service. You are solely responsible for the content you create.</p>

                <h3>5. Privacy</h3>
                <p>We collect only the information necessary to operate the Service (username, hashed password, and the todo items you create). We do not sell or share your data with third parties. Data is stored on servers located in Japan.</p>

                <h3>6. Intellectual Property</h3>
                <p>The Service and its original content (excluding user content) are the property of the operator and are protected by applicable intellectual property laws.</p>

                <h3>7. Termination</h3>
                <p>We reserve the right to suspend or terminate your access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, the Service, or third parties.</p>

                <h3>8. Disclaimer of Warranties</h3>
                <p>The Service is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.</p>

                <h3>9. Limitation of Liability</h3>
                <p>To the fullest extent permitted by law, the operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, arising out of or in connection with your use of the Service.</p>

                <h3>10. Changes to These Terms</h3>
                <p>We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.</p>

                <h3>11. Contact</h3>
                <p>If you have questions about these Terms, please contact us at <a href="mailto:skypattern@protonmail.com">skypattern@protonmail.com</a>.</p>

                <p><Link to="/">← Back to Home</Link></p>
            </article>
            <footer>
                <hr />
                <FooterText />
            </footer>
        </main>
    );
}
