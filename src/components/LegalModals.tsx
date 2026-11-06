import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Mail,
  FileText,
  Sparkles,
  Send,
  AlertTriangle,
  Scale,
  CheckCircle2,
  ExternalLink,
  Lock,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { Language, LegalModalType } from '../types';
import { translations } from '../translations';

interface LegalModalsProps {
  type: LegalModalType;
  onClose: () => void;
  lang: Language;
  onSwitchType?: (type: LegalModalType) => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({
  type,
  onClose,
  lang,
  onSwitchType,
}) => {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });

  if (!type) return null;
  const t = translations[lang];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactFormData.name || !contactFormData.email || !contactFormData.message) return;
    setContactSubmitted(true);
  };

  const resetContactForm = () => {
    setContactSubmitted(false);
    setContactFormData({
      name: '',
      email: '',
      subject: 'general',
      message: '',
    });
  };

  const renderContent = () => {
    switch (type) {
      // ─────────────────────────────────────────────────────────────
      // 1. ABOUT US (من نحن)
      // ─────────────────────────────────────────────────────────────
      case 'about':
        return (
          <div className="space-y-5 text-xs sm:text-sm text-neutral-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-3 pb-3 border-b border-[#252837]">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {lang === 'ar' ? 'من نحن — ديسك سبيس 4K' : 'About DeskSpace4K'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {lang === 'ar'
                    ? 'المنصة الرائدة في تنظيم وتنسيق خلفيات الشاشة فائقة الدقة'
                    : 'The premier destination for native 3840×2160 Ultra HD desktop media'}
                </p>
              </div>
            </div>

            <p>
              {lang === 'ar'
                ? 'تأسست منصة ديسك سبيس 4K (DeskSpace4K) لتلبية احتياجات المصممين، المبرمجين، عشاق الألعاب، ومستخدمي الشاشات الحديثة فائقة الدقة بدقة 4K و Ultra HD و OLED الذين يبحثون عن محتوى بصري عالي الجودة بنقاء استثنائي دون ضغط جائر أو تشويش في الألوان.'
                : 'DeskSpace4K was established to fulfill the discerning visual standards of software engineers, digital artists, competitive gamers, and workstation enthusiasts operating on native 4K UHD, OLED, and multi-monitor setups who demand uncompressed 3840×2160 fidelity without lossy degradation or intrusive watermarks.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-[#14151B] border border-[#272A3C] space-y-1.5">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-cyan-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'دقة 3840×2160 أصلية' : 'Guaranteed 3840×2160 4K'}</span>
                </h4>
                <p className="text-neutral-400 text-xs">
                  {lang === 'ar'
                    ? 'جميع ملفات المعرض تخضع لفحص دقيق لضمان الأبعاد الأصلية بنسبة 16:9 أو 21:9 وتوازن الألوان.'
                    : 'Every image is curated and tested for native subpixel sharpness, ensuring zero upscaling artifacts on high-DPI displays.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#14151B] border border-[#272A3C] space-y-1.5">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'معالجة فورية بالمتصفح' : 'Instant Client-Side Cropping'}</span>
                </h4>
                <p className="text-neutral-400 text-xs">
                  {lang === 'ar'
                    ? 'محرك اقتطاع متقدم يعمل مباشرة في متصفحك لإنتاج أبعاد 2K و Full HD وهواتف ذكية 9:16 دون أي إعادة توجيه.'
                    : 'Interactive in-browser HTML5 canvas engine that exports optimized resolution crops without external redirects or tracking.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#13141B] border border-[#242636] space-y-2">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider">
                {lang === 'ar' ? 'التزامنا تجاه مجتمع المستخدمين' : 'Our Quality & Compliance Commitments'}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
                <li>{lang === 'ar' ? 'واجهة مستخدم نظيفة وسريعة خالية من أزرار التحميل الخادعة أو النوافذ المنبثقة.' : 'Clean, fast-loading UI with zero misleading download buttons or deceptive click-targets.'}</li>
                <li>{lang === 'ar' ? 'دعم كامل ومتقن للغتين العربية والإنجليزية مع مراعاة اتجاه القراءة RTL و LTR.' : 'Full native bilingual support in Arabic and English with seamless typography and layout mirroring.'}</li>
                <li>{lang === 'ar' ? 'احترام كامل لحقوق الملكية الفكرية وتوفير آلية إبلاغ سريعة ومتوافقة مع DMCA.' : 'Strict adherence to intellectual property standards and rapid DMCA compliance resolution.'}</li>
              </ul>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────
      // 2. CONTACT US (اتصل بنا)
      // ─────────────────────────────────────────────────────────────
      case 'contact':
        return (
          <div className="space-y-4 text-xs sm:text-sm text-neutral-300 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-3 pb-3 border-b border-[#252837]">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t.contactUs}
                </h3>
                <p className="text-xs text-neutral-400">
                  {lang === 'ar'
                    ? 'يسعدنا دائماً تلقي اقتراحاتكم، استفساراتكم، وبلاغات حقوق الملكية'
                    : 'Direct communications with the DeskSpace4K editorial and operations team'}
                </p>
              </div>
            </div>

            {contactSubmitted ? (
              <div className="p-6 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                <h4 className="font-bold text-base text-white">
                  {t.contactFormSuccess}
                </h4>
                <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                  {t.contactFormSuccessDesc}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetContactForm}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                  >
                    {lang === 'ar' ? 'إرسال رسالة أخرى' : 'Send Another Message'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      {t.contactFormName} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactFormData.name}
                      onChange={(e) =>
                        setContactFormData({ ...contactFormData, name: e.target.value })
                      }
                      placeholder={lang === 'ar' ? 'مثال: وليد ميرزا' : 'e.g. Alex Henderson'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#14151B] border border-[#272A3C] text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      {t.contactFormEmail} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={contactFormData.email}
                      onChange={(e) =>
                        setContactFormData({ ...contactFormData, email: e.target.value })
                      }
                      placeholder="name@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#14151B] border border-[#272A3C] text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.contactFormSubject} <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={contactFormData.subject}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, subject: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#14151B] border border-[#272A3C] text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="general">{t.contactFormSubjectGeneral}</option>
                    <option value="dmca">{t.contactFormSubjectDMCA}</option>
                    <option value="submission">{t.contactFormSubjectSubmission}</option>
                    <option value="business">{t.contactFormSubjectBusiness}</option>
                    <option value="bug">{t.contactFormSubjectBug}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    {t.contactFormMessage} <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactFormData.message}
                    onChange={(e) =>
                      setContactFormData({ ...contactFormData, message: e.target.value })
                    }
                    placeholder={
                      lang === 'ar'
                        ? 'يرجى كتابة تفاصيل استفسارك أو رقم الخلفية المحددة...'
                        : 'Provide complete details regarding your inquiry, wallpaper ID, or request...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#14151B] border border-[#272A3C] text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t.contactFormSend}</span>
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-[#222432] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">
                {t.contactDirectEmail}
              </span>
              <a
                href="mailto:support@deskspace4k.com"
                className="text-cyan-400 hover:text-cyan-300 font-mono underline"
              >
                support@deskspace4k.com
              </a>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────────────────────
      // 3. PRIVACY POLICY (سياسة الخصوصية) - FULL ADSENSE / GDPR / CCPA
      // ─────────────────────────────────────────────────────────────
      case 'privacy':
        return (
          <div className="space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-3 pb-3 border-b border-[#252837]">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t.privacyPolicy}
                </h3>
                <p className="text-xs text-neutral-400">
                  {lang === 'ar'
                    ? 'متوافقة مع معايير Google AdSense و GDPR و CCPA لعام 2026'
                    : 'Compliant with Google AdSense Policies, GDPR, CCPA/CPRA, and International Privacy Laws'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#121319] border border-[#242636] text-xs text-neutral-400">
              <span className="font-semibold text-white">
                {lang === 'ar' ? 'تاريخ التحديث الأخير:' : 'Last Updated:'}
              </span>{' '}
              {lang === 'ar' ? '17 أكتوبر 2026' : 'October 17, 2026'}
            </div>

            <p>
              {lang === 'ar'
                ? 'في ديسك سبيس 4K (DeskSpace4K)، يُعتبر الحفاظ على خصوصية الزوار أولوية قصوى. توضح هذه الوثيقة نوعية المعلومات التي نقوم بجمعها وكيفية استخدامها وحمايتها، بما يتطابق بالكامل مع سياسات برنامج إعلانات Google AdSense واللوائح الدولية لحماية البيانات.'
                : 'At DeskSpace4K, accessible from deskspace4k.com, visitor privacy is of paramount importance. This Privacy Policy document outlines the types of personal and technical data collected, recorded, and utilized by DeskSpace4K, ensuring comprehensive compliance with Google AdSense publisher requirements, the EU General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA).'}
            </p>

            {/* Section 1: Log Files */}
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar' ? '1. ملفات السجل (Log Files)' : '1. Standard Log Files & Analytics'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'يتبع موقع ديسك سبيس 4K الإجراءات القياسية في استخدام ملفات السجل. تسجل هذه الملفات الزوار عند تصفحهم الموقع، بما في ذلك بروتوكول الإنترنت (IP)، نوع المتصفح، مزود خدمة الإنترنت (ISP)، التاريخ والوقت، صفحات الإحالة والخروج، وعدد النقرات لتحليل الاتجاهات وإدارة الموقع بصورة آمنة دون ربطها بهوية شخصية مباشرة.'
                : 'DeskSpace4K follows standard industry procedures using server log files. The logged information includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date/time stamps, referring/exit pages, and click counts. This data is utilized solely for analyzing trends, administering the site, tracking aggregate movement across the catalog, and maintaining web server infrastructure integrity.'}
            </p>

            {/* Section 2: Cookies & Google AdSense */}
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar'
                ? '2. ملفات تعريف الارتباط وإعلانات Google AdSense'
                : '2. Cookies, Web Beacons & Google AdSense Partner Policies'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'يستخدم الموقع ملفات تعريف الارتباط (Cookies) لتخزين تفضيلات الزوار مثل اللغة المفضلة وسجل التنزيلات في الذاكرة المحلية (LocalStorage). بالإضافة إلى ذلك، يعد Google أحد البائعين التابعين لجهات خارجية على موقعنا، ويستخدم ملفات تعريف الارتباط المعروفة باسم ملفات DART لعرض الإعلانات لزوار موقعنا استناداً إلى زيارتهم لهذا الموقع ومواقع أخرى على الإنترنت.'
                : 'Like most modern web services, DeskSpace4K utilizes cookies and browser LocalStorage to store visitor preferences (such as selected language and download history). Furthermore, Google is a third-party vendor on our site. Google uses cookies—including DoubleClick DART cookies—to serve advertisements to visitors based upon their visit to deskspace4k.com and other websites across the Internet.'}
            </p>
            <p className="bg-[#121319] p-3 rounded-xl border border-[#222432] text-xs">
              <span className="font-semibold text-white">
                {lang === 'ar' ? 'إلغاء الاشتراك في الإعلانات المخصصة:' : 'Opting Out of Personalized Advertising:'}
              </span>{' '}
              {lang === 'ar'
                ? 'يمكن للزوار اختيار رفض استخدام ملفات تعريف ارتباط DART من خلال زيارة سياسة خصوصية شبكة إعلانات Google والمحتوى على الرابط: '
                : 'Users may opt out of personalized advertising by visiting Google Ad Settings at '}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline font-mono inline-flex items-center gap-1"
              >
                <span>adssettings.google.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {lang === 'ar' ? ' أو عبر بوابة مبادرة الإعلانات على الشبكة (NAI).' : ' or via the Network Advertising Initiative at www.aboutads.info.'}
            </p>

            {/* Section 3: GDPR Rights */}
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar' ? '3. حقوق حماية البيانات بموجب GDPR' : '3. GDPR Data Protection Rights (EU Users)'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'يحق لكل مستخدم مقيم في المنطقة الاقتصادية الأوروبية ممارسة حقوقه الكاملة: حق الوصول إلى البيانات، حق التصحيح، حق الحذف (الحق في النسيان)، حق تقييد المعالجة، وحق نقل البيانات. يمكنك الاتصال بنا في أي وقت لممارسة أي من هذه الحقوق مجاناً.'
                : 'Under the General Data Protection Regulation, EU users are entitled to: the Right to Access (request copies of personal data), Right to Rectification (request correction of inaccurate information), Right to Erasure (request deletion under certain conditions), Right to Restrict Processing, and Right to Data Portability. Contact our privacy team to exercise these rights.'}
            </p>

            {/* Section 4: CCPA Rights */}
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar'
                ? '4. حقوق خصوصية المستهلك في كاليفورنيا (CCPA / CPRA)'
                : '4. California Consumer Privacy Act (CCPA / CPRA)'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'بموجب قانون CCPA، نؤكد أن ديسك سبيس 4K لا يبيع ولا يؤجر بيانات المستخدمين الشخصية لأي طرف ثالث على الإطلاق. يحق لسكان كاليفورنيا طلب الكشف عن فئات البيانات المجمعة وطلب حذف بياناتهم في أي وقت.'
                : 'Under the California Consumer Privacy Act, California consumers have the right to request disclosure of personal data categories collected, request deletion of collected personal data, and the right to opt-out of the sale of personal data. DeskSpace4K explicitly declares that WE DO NOT SELL OR SHARE PERSONAL DATA FOR MONETARY VALUE.'}
            </p>

            {/* Section 5: Children's Privacy */}
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar' ? '5. حماية خصوصية الأطفال (COPPA)' : '5. Children’s Online Privacy Protection (COPPA)'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'نحن لا نجمع أي معلومات تعريف شخصية عن عمد من الأطفال الذين تقل أعمارهم عن 13 عاماً. إذا كان لديك سبب للاعتقاد بأن طفلاً قدم معلومات لنا، يرجى الاتصال بنا فوراً وسنقوم بإزالتها على الفور من سجلاتنا.'
                : 'DeskSpace4K does not knowingly collect personally identifiable information from children under the age of 13. If you believe your child provided this kind of information on our website, we strongly encourage you to contact us immediately for prompt removal.'}
            </p>
          </div>
        );

      // ─────────────────────────────────────────────────────────────
      // 4. TERMS OF SERVICE (الشروط والأحكام)
      // ─────────────────────────────────────────────────────────────
      case 'terms':
        return (
          <div className="space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-3 pb-3 border-b border-[#252837]">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t.termsOfService}
                </h3>
                <p className="text-xs text-neutral-400">
                  {lang === 'ar'
                    ? 'شروط الاستخدام، ترخيص الخلفيات، وحقوق الملكية الفكرية'
                    : 'Usage Agreement, Wallpaper Licensing & Fair Use Guidelines'}
                </p>
              </div>
            </div>

            <p>
              {lang === 'ar'
                ? 'أهلاً بك في ديسك سبيس 4K. باستخدامك لهذا الموقع أو تحميل أي خلفية شاشة منه، فإنك توافق على الالتزام الكامل بهذه الشروط والأحكام وجميع القوانين المعمول بها.'
                : 'Welcome to DeskSpace4K. By accessing this website or downloading any digital 4K wallpaper media, you agree to be bound by these Terms of Service, all applicable laws, and regulations, and agree that you are responsible for compliance with any applicable local laws.'}
            </p>

            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar' ? '1. ترخيص الاستخدام الشخصي' : '1. Personal Use License'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'يتم توفير جميع خلفيات الشاشة بدقة 4K و 2K وتنسيقات الهواتف المحمولة مجاناً للاستخدام الشخصي غير التجاري كخلفيات لأجهزة الكمبيوتر المكتبية، الحواسيب المحمولة، الأجهزة اللوحية، والهواتف الذكية. لا يُسمح بإعادة بيع الصور، توزيعها كحزم مدفوعة، أو استخدامها في أغراض تجارية دون الحصول على إذن صريح من صاحب الحقوق الأصلي.'
                : 'Wallpapers provided on DeskSpace4K are designated for free personal, non-commercial desktop and mobile device wallpaper customization. You may not re-license, sell, repackage into commercial asset packs, or host bulk automated scraper repositories of our curated catalog without explicit authorization.'}
            </p>

            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar' ? '2. السلوك المحظور' : '2. Prohibited Conduct & Scraper Protections'}
            </h4>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
              <li>{lang === 'ar' ? 'حظر استخدام برامج الروبوت أو برامج الزحف الآلية لتنزيل المحتوى دفعة واحدة بما يضر باستقرار الخوادم.' : 'Employing automated scrapers, crawlers, or high-concurrency bot downloading that degrades platform bandwidth.'}</li>
              <li>{lang === 'ar' ? 'حظر محاولة تعطيل أو التحايل على الوحدات الإعلانية المعتمدة أو تدابير الأمان.' : 'Circumventing or attempting to disrupt certified advertisement containers or site security architectures.'}</li>
              <li>{lang === 'ar' ? 'حظر انتحال صفة أي شخص أو تزوير إشعارات حقوق الملكية الفكرية.' : 'Submitting fraudulent copyright or DMCA notices under penalty of law.'}</li>
            </ul>

            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400 pt-2">
              {lang === 'ar' ? '3. إخلاء المسؤولية' : '3. Disclaimer of Warranties'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'يتم توفير محتوى الموقع "كما هو" و"حسب توفره" دون أي ضمانات صريحة أو ضمنية. لا تضمن ديسك سبيس 4K خلو الموقع من الانقطاعات أو الأخطاء العارضة الناتجة عن شبكات الإنترنت العالمية.'
                : 'The materials on DeskSpace4K are provided on an "as is" and "as available" basis. DeskSpace4K makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability or fitness for a particular purpose.'}
            </p>
          </div>
        );

      // ─────────────────────────────────────────────────────────────
      // 5. DMCA / COPYRIGHT POLICY (حقوق الملكية الفكرية)
      // ─────────────────────────────────────────────────────────────
      case 'dmca':
        return (
          <div className="space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-3 pb-3 border-b border-[#252837]">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {lang === 'ar' ? 'حقوق الملكية الفكرية وسياستنا (DMCA)' : 'DMCA & Copyright Compliance Policy'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {lang === 'ar'
                    ? 'إجراءات الإبلاغ عن انتهاك حقوق النشر وإزالة المحتوى وفقاً للقانون الفيدرالي'
                    : 'Digital Millennium Copyright Act Notice & Takedown Protocol (17 U.S.C. § 512)'}
                </p>
              </div>
            </div>

            <p>
              {lang === 'ar'
                ? 'يحترم موقع ديسك سبيس 4K حقوق الملكية الفكرية للفنانين والمصورين والمصممين الرقميين في جميع أنحاء العالم. نلتزم بالكامل بأحكام قانون الألفية الجديدة لحقوق طبع ونشر المواد الرقمية (DMCA) المعمول به دولياً.'
                : 'DeskSpace4K respects the intellectual property rights of artists, photographers, digital creators, and studios worldwide. We adhere to the Digital Millennium Copyright Act (Title 17, United States Code, Section 512) and international copyright conventions.'}
            </p>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {lang === 'ar' ? 'إجراءات تقديم إشعار الإزالة الفوري:' : 'Formal Takedown Notification Requirements:'}
                </span>
              </div>
              <p className="text-amber-300/90 leading-relaxed">
                {lang === 'ar'
                  ? 'إذا كنت مالكاً لعمل فني أو مفوضاً عنه وتعتقد بحسن نية أن خلفية شاشة معروضة على موقعنا تنتهك حقوق النشر الخاصة بك، يرجى تزويدنا بالمعلومات التالية لاتخاذ إجراء الإزالة الفوري في غضون 24-48 ساعة عمل:'
                  : 'If you are a copyright owner or authorized representative and believe that any wallpaper hosted on DeskSpace4K infringes your rights, please provide our designated copyright agent with the following details for immediate takedown resolution:'}
              </p>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-neutral-300 text-xs">
              <li>
                <strong className="text-white">
                  {lang === 'ar' ? 'تحديد العمل المحمي:' : 'Identification of the Copyrighted Work:'}
                </strong>{' '}
                {lang === 'ar'
                  ? 'وصف كافٍ للعمل الفني الأصلي المحمي بحقوق الطبع والنشر، أو رابط لموقعك الرسمي.'
                  : 'A description of the copyrighted work claimed to have been infringed, or link to original source.'}
              </li>
              <li>
                <strong className="text-white">
                  {lang === 'ar' ? 'تحديد المادة المطلوب إزالتها:' : 'Identification of Infringing Wallpaper:'}
                </strong>{' '}
                {lang === 'ar'
                  ? 'رابط الصفحة أو عنوان الخلفية ومعرفها (Wallpaper ID) على ديسك سبيس 4K.'
                  : 'The specific URL, wallpaper title, or Wallpaper ID on DeskSpace4K to be removed.'}
              </li>
              <li>
                <strong className="text-white">
                  {lang === 'ar' ? 'معلومات الاتصال بالمالك:' : 'Your Contact Details:'}
                </strong>{' '}
                {lang === 'ar'
                  ? 'الاسم الكامل، العنوان البريدي، رقم الهاتف، والبريد الإلكتروني المعتمد.'
                  : 'Your legal name, mailing address, telephone number, and official email address.'}
              </li>
              <li>
                <strong className="text-white">
                  {lang === 'ar' ? 'إقرار حسن النية:' : 'Good Faith Statement:'}
                </strong>{' '}
                {lang === 'ar'
                  ? 'بيان بأنك تعتقد بحسن نية أن استخدام المادة غير مصرح به من قِبل مالك حقوق النشر.'
                  : 'A statement that you have a good faith belief that the disputed use is not authorized.'}
              </li>
              <li>
                <strong className="text-white">
                  {lang === 'ar' ? 'التوقيع الإلكتروني أو الفعلي:' : 'Signature:'}
                </strong>{' '}
                {lang === 'ar'
                  ? 'توقيع إلكتروني أو فعلي للمالك أو الشخص المفوض للتصرف نيابة عنه تحت طائلة عقوبة الحنث باليمين.'
                  : 'A physical or electronic signature of the person authorized to act under penalty of perjury.'}
              </li>
            </ol>

            <div className="p-4 rounded-xl bg-[#14151B] border border-[#272A3C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="font-bold text-white text-xs">
                  {lang === 'ar' ? 'وكيل حقوق النشر المعتمد (DMCA Agent):' : 'Designated Copyright Agent:'}
                </h5>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  dmca@deskspace4k.com · support@deskspace4k.com
                </p>
              </div>

              {onSwitchType && (
                <button
                  type="button"
                  onClick={() => onSwitchType('contact')}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'إرسال إشعار عبر نموذج الاتصال' : 'Submit Notice via Form'}</span>
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-[#15161C] border border-[#272938] rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 text-neutral-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white bg-[#1E2028] hover:bg-[#282B37] transition-colors cursor-pointer z-10"
          aria-label={t.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Quick Tabs switcher so evaluators/users can flip between policies easily */}
        <div className="flex flex-wrap items-center gap-1.5 pb-4 mb-4 border-b border-[#222432] pr-10">
          <button
            type="button"
            onClick={() => onSwitchType && onSwitchType('privacy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              type === 'privacy'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-[#1C1E26]'
            }`}
          >
            {t.privacyPolicy}
          </button>
          <button
            type="button"
            onClick={() => onSwitchType && onSwitchType('terms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              type === 'terms'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-[#1C1E26]'
            }`}
          >
            {t.termsOfService}
          </button>
          <button
            type="button"
            onClick={() => onSwitchType && onSwitchType('about')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              type === 'about'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-[#1C1E26]'
            }`}
          >
            {t.aboutUs}
          </button>
          <button
            type="button"
            onClick={() => onSwitchType && onSwitchType('contact')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              type === 'contact'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-[#1C1E26]'
            }`}
          >
            {t.contactUs}
          </button>
          <button
            type="button"
            onClick={() => onSwitchType && onSwitchType('dmca')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              type === 'dmca'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-[#1C1E26]'
            }`}
          >
            {t.dmcaPolicy}
          </button>
        </div>

        {/* Modal Dynamic Body */}
        {renderContent()}

        {/* Modal Footer Controls */}
        <div className="mt-5 pt-3 border-t border-[#222432] flex items-center justify-between text-xs text-neutral-400">
          <span className="text-[11px] font-mono text-neutral-400">
            DeskSpace4K Legal &amp; Policy Registry · 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#20222D] hover:bg-[#2A2D3C] text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
