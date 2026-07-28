import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/layout/Footer';
import { SERVICE_NAME, COMPANY_LEGAL_NAME, CONTACT_EMAIL, CONTACT_FACEBOOK, GOVERNING_LAW, LAST_UPDATED } from './legalConfig';

const Section = ({ n, title, children }) => (
    <section>
        <h2 className="text-xl font-bold text-slate-900 mb-3">{n}. {title}</h2>
        <div className="space-y-2">{children}</div>
    </section>
);

const Privacy = () => {
    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="flex-grow py-12 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <Link to="/" className="text-blue-600 font-bold flex items-center gap-1 mb-8 hover:underline w-fit">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Home
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
                    <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last updated: {LAST_UPDATED}</p>

                    <div className="prose max-w-none text-slate-700 space-y-8 leading-relaxed">
                        <p>
                            This Privacy Policy explains how {COMPANY_LEGAL_NAME} (“{SERVICE_NAME}”, “we”, “us”, or “our”) collects,
                            uses, shares, and protects your information when you use the {SERVICE_NAME} website, mobile experience,
                            and related services (the “Service”). We are committed to handling your and your pets’ data responsibly.
                            By using the Service, you agree to the practices described here.
                        </p>

                        <Section n="1" title="Who we are">
                            <p>
                                {SERVICE_NAME} is a pet-care community platform for pet owners and animal-care professionals in Egypt.
                                It offers community discussion, a lost &amp; found board, pet adoption, pet hosting, and — as they
                                become available — veterinary and trainer bookings, a marketplace, and subscription boxes.
                                For any privacy question, contact us using the details in the “Contact us” section below.
                            </p>
                        </Section>

                        <Section n="2" title="Information we collect">
                            <p>We collect the following categories of information:</p>
                            <ul className="list-disc pl-5 space-y-1.5">
                                <li><strong>Account &amp; identity data:</strong> your name, email address, phone number (if provided), password (stored only as a secure hash — never in plain text), profile photo, and role (owner, veterinarian, trainer, or shop).</li>
                                <li><strong>Pet data:</strong> pet names, species, breed, age, photos, biographies, and any health or vaccination notes you choose to add.</li>
                                <li><strong>Location data:</strong> a neighborhood or approximate coordinates you set or allow, used to rank nearby vets and shops and to match lost &amp; found reports. You control this and can use a general area instead of a precise location.</li>
                                <li><strong>Content you post:</strong> community posts and comments, lost &amp; found reports, adoption and mating listings, images you upload, and reviews.</li>
                                <li><strong>Messages:</strong> chat messages you exchange with other users or professionals through the Service.</li>
                                <li><strong>AI assistant (VetAI) conversations:</strong> the questions and photos you send to our in-app assistant, and its responses.</li>
                                <li><strong>Payment information:</strong> when paid features are enabled, payment is handled by a third-party payment processor. We do not store full card numbers on our servers.</li>
                                <li><strong>Technical &amp; usage data:</strong> device and browser information, IP address, pages visited, and similar diagnostic data used for security and to improve the Service.</li>
                            </ul>
                        </Section>

                        <Section n="3" title="How we use your information">
                            <ul className="list-disc pl-5 space-y-1.5">
                                <li>To create and operate your account and provide the features you use.</li>
                                <li>To show relevant content — e.g. nearby vets/shops, lost &amp; found matches, and adoptable pets — based on your location.</li>
                                <li>To enable communication between users and professionals.</li>
                                <li>To power the VetAI assistant, including general (non-diagnostic) guidance.</li>
                                <li>To keep the Service safe: detect and prevent fraud, spam, abuse, and unauthorized access.</li>
                                <li>To send service messages (e.g. booking confirmations, password resets, and important notices).</li>
                                <li>To comply with legal obligations and enforce our Terms of Service.</li>
                            </ul>
                        </Section>

                        <Section n="4" title="How the VetAI assistant handles your data">
                            <p>
                                The VetAI assistant provides general pet-care information and is <strong>not a substitute for professional
                                veterinary advice</strong>. To generate responses we send the text of your question to a third-party AI
                                provider. We minimize what is shared: personal identifiers such as names, emails, and account IDs are
                                stripped before any content is sent to the external model. Photos you attach are analyzed only to provide
                                non-diagnostic observations and are never used to make a medical diagnosis.
                            </p>
                        </Section>

                        <Section n="5" title="How we share information">
                            <p>We do not sell your personal data. We share information only as follows:</p>
                            <ul className="list-disc pl-5 space-y-1.5">
                                <li><strong>With other users:</strong> content you choose to make public (community posts, lost &amp; found reports, adoption/mating listings, your public profile) is visible to others. Please avoid posting sensitive personal information.</li>
                                <li><strong>With professionals you engage:</strong> when you book or message a vet, trainer, host, or shop, the information necessary to fulfil that request is shared with them.</li>
                                <li><strong>With service providers (processors)</strong> who operate the platform on our behalf, including: cloud hosting, our database, image storage and delivery, our AI provider, email delivery, SMS delivery, and mapping data. These providers process data only on our instructions.</li>
                                <li><strong>For legal and safety reasons:</strong> to comply with the law, respond to lawful requests, or protect the rights, property, and safety of our users, the public, or {SERVICE_NAME}.</li>
                            </ul>
                        </Section>

                        <Section n="6" title="Cookies &amp; local storage">
                            <p>
                                We use cookies and browser local storage to keep you signed in, remember preferences, and operate core
                                features (for example, your session token and your recent VetAI conversation are stored on your device).
                                You can clear these through your browser at any time; doing so may sign you out. See our{' '}
                                <Link to="/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link> for details.
                            </p>
                        </Section>

                        <Section n="7" title="Data retention">
                            <p>
                                We keep your information for as long as your account is active or as needed to provide the Service.
                                You may delete your account at any time from your profile settings; we will delete or anonymize your
                                personal data thereafter, except where we must retain it to meet legal, security, or dispute-resolution
                                obligations.
                            </p>
                        </Section>

                        <Section n="8" title="How we protect your information">
                            <p>
                                We use industry-standard safeguards, including encrypted connections (HTTPS), password hashing with bcrypt,
                                rate limiting and account-lockout protections, and role-based access controls. No method of transmission or
                                storage is 100% secure, but we work continuously to protect your data.
                            </p>
                        </Section>

                        <Section n="9" title="Your rights &amp; choices">
                            <ul className="list-disc pl-5 space-y-1.5">
                                <li>Access, correct, or update your information from your profile settings.</li>
                                <li>Delete your account and associated personal data.</li>
                                <li>Control your location precision and what you post publicly.</li>
                                <li>Opt out of non-essential communications.</li>
                            </ul>
                            <p>To exercise any right you cannot complete in-app, contact us using the details below.</p>
                        </Section>

                        <Section n="10" title="Children">
                            <p>
                                The Service is intended for users aged 18 and over. We do not knowingly collect personal data from children.
                                If you believe a child has provided us information, please contact us so we can remove it.
                            </p>
                        </Section>

                        <Section n="11" title="International processing">
                            <p>
                                Some of our service providers may process data on servers located outside {GOVERNING_LAW}. Where this
                                happens, we take steps to ensure your information continues to be protected in line with this policy.
                            </p>
                        </Section>

                        <Section n="12" title="Changes to this policy">
                            <p>
                                We may update this Privacy Policy from time to time. When we do, we will revise the “Last updated” date above
                                and, for significant changes, provide a notice within the Service.
                            </p>
                        </Section>

                        <Section n="13" title="Contact us">
                            <p>
                                If you have questions about this policy or your data, contact us at{' '}
                                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
                                or through our official page on{' '}
                                <a href={CONTACT_FACEBOOK} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook</a>.
                            </p>
                        </Section>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Privacy;
