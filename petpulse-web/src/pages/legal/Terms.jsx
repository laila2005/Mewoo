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

const Terms = () => {
    return (
        <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex flex-col">
            <div className="flex-grow py-12 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
                    <Link to="/" className="text-blue-600 font-bold flex items-center gap-1 mb-8 hover:underline w-fit">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Home
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Terms of Service</h1>
                    <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last updated: {LAST_UPDATED}</p>

                    <div className="prose max-w-none text-slate-700 space-y-8 leading-relaxed">
                        <p>
                            These Terms of Service (“Terms”) govern your access to and use of the {SERVICE_NAME} platform operated by
                            {' '}{COMPANY_LEGAL_NAME} (“{SERVICE_NAME}”, “we”, “us”). By creating an account or using the Service, you agree
                            to these Terms. If you do not agree, please do not use the Service.
                        </p>

                        {/* Prominent health disclaimer */}
                        <div className="not-prose bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-amber-900 mb-1">Important health notice</p>
                            <p className="text-sm text-amber-800/90 leading-relaxed">
                                {SERVICE_NAME} and its AI assistant (“VetAI”) provide general information only and are <strong>not a
                                substitute for professional veterinary care</strong>. Never delay seeking advice from a licensed
                                veterinarian because of something you read here. In an emergency, contact a veterinary clinic immediately.
                            </p>
                        </div>

                        <Section n="1" title="Eligibility &amp; accounts">
                            <p>
                                You must be at least 18 years old to use the Service. You are responsible for the accuracy of the
                                information you provide, for keeping your password confidential, and for all activity under your account.
                                Notify us promptly of any unauthorized use of your account.
                            </p>
                        </Section>

                        <Section n="2" title="Acceptable use">
                            <p>You agree not to:</p>
                            <ul className="list-disc pl-5 space-y-1.5">
                                <li>Break any applicable law or infringe anyone’s rights;</li>
                                <li>Post content that is false, harmful, hateful, harassing, or that impersonates another person;</li>
                                <li>Misrepresent a pet’s health, ownership, or eligibility for adoption, mating, or rehoming;</li>
                                <li>Spam, scrape, reverse-engineer, or attempt to disrupt or gain unauthorized access to the Service;</li>
                                <li>Upload malware, or content you do not have the right to share.</li>
                            </ul>
                        </Section>

                        <Section n="3" title="Your content">
                            <p>
                                You retain ownership of the content you post (text, images, listings, reviews). By posting, you grant
                                {' '}{SERVICE_NAME} a non-exclusive, worldwide, royalty-free license to host, display, and distribute that
                                content solely to operate and promote the Service. You are responsible for your content and confirm you
                                have the right to share it. We may remove content or suspend accounts that violate these Terms.
                            </p>
                        </Section>

                        <Section n="4" title="Community, Lost &amp; Found, and Adoption">
                            <p>
                                {SERVICE_NAME} is a platform that connects people; we do not independently verify every listing, report, or
                                user. Adoptions, rehoming, and reunions are arranged between users. Exercise caution, meet in safe public
                                places, and verify information before acting. {SERVICE_NAME} is not responsible for interactions or
                                arrangements that take place between users.
                            </p>
                        </Section>

                        <Section n="5" title="Pet hosting">
                            <p>
                                Where hosting is offered, arrangements — including any payment — are made directly between the pet owner and
                                the host. {SERVICE_NAME} is not a party to those arrangements and does not guarantee any host or stay. Please
                                agree on terms clearly and in advance with the other party.
                            </p>
                        </Section>

                        <Section n="6" title="Professionals, bookings &amp; verification">
                            <p>
                                Veterinary and trainer features may show a verification badge indicating a document was reviewed. A badge is
                                not a warranty, endorsement, or guarantee of a professional’s qualifications, and you remain responsible for
                                satisfying yourself about any professional you engage. Bookings are subject to the professional’s
                                availability and confirmation.
                            </p>
                        </Section>

                        <Section n="7" title="Availability &amp; features in progress">
                            <p>
                                {SERVICE_NAME} is being rolled out in stages. Some features (for example, vet booking, the marketplace, and
                                paid subscriptions) may be marked “coming soon” and unavailable during early access. We may add, change, or
                                remove features, and we do not guarantee uninterrupted availability of the Service.
                            </p>
                        </Section>

                        <Section n="8" title="Payments">
                            <p>
                                When paid features are enabled, prices are shown before purchase and payments are handled by a third-party
                                payment processor. Where {SERVICE_NAME} facilitates payments to professionals or shops, a platform service
                                fee may apply and will be disclosed. Refund eligibility depends on the specific service and the provider.
                            </p>
                        </Section>

                        <Section n="9" title="Intellectual property">
                            <p>
                                The {SERVICE_NAME} name, logo, and the software and design of the Service are owned by {COMPANY_LEGAL_NAME}
                                {' '}and protected by law. You may not copy or use them without our permission, except for content you own as
                                described above.
                            </p>
                        </Section>

                        <Section n="10" title="Disclaimers">
                            <p>
                                The Service is provided “as is” and “as available”, without warranties of any kind, whether express or
                                implied, including fitness for a particular purpose. We do not warrant that the Service will be error-free,
                                secure, or continuously available, or that any information (including AI-generated content) is accurate or
                                complete.
                            </p>
                        </Section>

                        <Section n="11" title="Limitation of liability">
                            <p>
                                To the maximum extent permitted by law, {SERVICE_NAME} and its team will not be liable for any indirect,
                                incidental, or consequential damages, or for any loss arising from your use of the Service, your interactions
                                with other users or professionals, your reliance on AI-generated information, or the care of your pet.
                                Nothing in these Terms limits liability that cannot be limited by law.
                            </p>
                        </Section>

                        <Section n="12" title="Indemnification">
                            <p>
                                You agree to indemnify and hold {SERVICE_NAME} harmless from claims arising out of your content, your use of
                                the Service, or your breach of these Terms.
                            </p>
                        </Section>

                        <Section n="13" title="Termination">
                            <p>
                                You may delete your account at any time. We may suspend or terminate accounts that violate these Terms or
                                that create risk for other users. Provisions that by their nature should survive termination (e.g. content
                                license terms, disclaimers, and liability limits) will survive.
                            </p>
                        </Section>

                        <Section n="14" title="Governing law">
                            <p>
                                These Terms are governed by the laws of {GOVERNING_LAW}, without regard to conflict-of-law rules. Disputes
                                will be subject to the competent courts of {GOVERNING_LAW}.
                            </p>
                        </Section>

                        <Section n="15" title="Changes to these Terms">
                            <p>
                                We may update these Terms from time to time. We will update the “Last updated” date and, for material
                                changes, provide notice within the Service. Continued use after changes means you accept the updated Terms.
                            </p>
                        </Section>

                        <Section n="16" title="Contact us">
                            <p>
                                Questions about these Terms? Reach us at{' '}
                                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
                                or via our official page on{' '}
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

export default Terms;
