import type { ReactNode } from 'react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 mb-4">
            Legal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-gray-500 mt-2">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="space-y-10">
          {/* 1. Acceptance */}
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Torrentio (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree with any part of these terms, you must not use the Service.
            </p>
          </Section>

          {/* 2. Service Description */}
          <Section title="2. Service Description">
            <p>
              Torrentio is a metadata-indexing platform that organizes and displays publicly available torrent
              information from third-party sources (including Nyaa.si) in a structured, searchable format.
            </p>
            <p className="mt-4">
              <strong className="text-white">Torrentio does not host, store, distribute, or transmit any copyrighted content, media files, or torrent files.</strong>
              {' '}We do not operate any trackers, seed any content, or maintain any file servers. All torrent metadata
              displayed on this site is obtained from publicly accessible third-party indexes.
            </p>
            <p className="mt-4">
              Any media playback that occurs through the Service uses peer-to-peer (WebTor) technology, which
              connects users directly to other peers. Torrentio does not intermediate, cache, or store the
              transmitted data.
            </p>
          </Section>

          {/* 3. User Conduct */}
          <Section title="3. User Responsibilities">
            <p>
              You agree to use the Service in compliance with all applicable local, national, and international
              laws and regulations. You are solely responsible for:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Ensuring that your use of the Service and any content you access is lawful in your jurisdiction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Not using the Service to infringe upon the intellectual property rights of others</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Not attempting to circumvent any security measures, rate limits, or access controls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Not using automated scripts, scrapers, or bots to access the Service without prior written permission</span>
              </li>
            </ul>
          </Section>

          {/* 4. DMCA */}
          <Section title="4. DMCA & Copyright Notice">
            <p>
              Torrentio respects the intellectual property rights of others and expects its users to do the same.
              In accordance with the Digital Millennium Copyright Act (DMCA), we will respond promptly to
              notices of alleged copyright infringement.
            </p>
            <p className="mt-4">
              If you believe that any content indexed on Torrentio infringes upon your copyright, please provide
              us with a written notice containing the following:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>A physical or electronic signature of the copyright owner or authorized representative</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Identification of the copyrighted work claimed to have been infringed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Identification of the material that is claimed to be infringing, with enough detail for us to locate it</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Your contact information (address, telephone number, and email address)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>A statement that you have a good faith belief that the use is not authorized by the copyright owner</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>A statement that the information in the notice is accurate, under penalty of perjury</span>
              </li>
            </ul>
            <p className="mt-4 text-gray-400 italic">
              DMCA takedown requests can be submitted to the contact email listed below.
              We will remove or disable access to the allegedly infringing material promptly upon receipt
              of a valid notice.
            </p>
          </Section>

          {/* 5. Third-Party Links */}
          <Section title="5. Third-Party Content & Links">
            <p>
              Torrentio indexes metadata from third-party sources and may contain links to external websites
              (such as AniList.co, Nyaa.si, and others). We have no control over, and assume no responsibility
              for, the content, privacy policies, or practices of any third-party websites.
            </p>
          </Section>

          {/* 6. Disclaimer */}
          <Section title="6. Disclaimer of Warranties">
            <p>
              The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Torrentio makes no
              representations or warranties of any kind, express or implied, regarding the operation or
              availability of the Service, or the accuracy, completeness, or reliability of any indexed content.
            </p>
            <p className="mt-4">
              Torrentio does not guarantee that:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>The Service will be uninterrupted, timely, secure, or error-free</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>The indexed metadata is accurate, complete, or up-to-date</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>Any content accessed through the Service is legal to download or stream in your jurisdiction</span>
              </li>
            </ul>
          </Section>

          {/* 7. Limitation of Liability */}
          <Section title="7. Limitation of Liability">
            <p>
              In no event shall Torrentio, its operators, or affiliates be liable for any direct, indirect,
              incidental, special, consequential, or punitive damages arising out of or relating to your use
              of, or inability to use, the Service. This includes, but is not limited to, damages for loss of
              profits, data, or other intangible losses.
            </p>
          </Section>

          {/* 8. Changes */}
          <Section title="8. Changes to Terms">
            <p>
              We reserve the right to modify or replace these Terms at any time. Material changes will be
              communicated by updating the &quot;Last updated&quot; date at the top of this page. Your continued
              use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </Section>

          {/* 9. Contact */}
          <Section title="9. Contact Information">
            <p>
              For questions about these Terms, or to submit a DMCA takedown request, please reach out to us
              through the contact information available on the Service.
            </p>
            <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-sm text-gray-400">
                <span className="text-gray-500">Email:</span>{' '}
                <a href="mailto:dmca@torrentio.app" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  dmca@torrentio.app
                </a>
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <div className="text-sm text-gray-400 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
