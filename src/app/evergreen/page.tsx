"use client";

import Link from 'next/link';
import {
    Phone,
    Mail,
    MapPin,
    Truck,
    ShieldCheck,
    Globe,
    Lock,
    Search,
    ArrowRight,
    Package,
    Building2,
    BarChart3,
    Verified,
    Send,
    Clock,
    Headset,
    Loader2,
    CheckCircle
} from 'lucide-react';
import { useState } from 'react';
import { sendEvergreenInquiry } from '../actions/emailActions';

export default function EvergreenLandingPage() {
    const services = [
        {
            icon: Truck,
            title: "Domestic Courier",
            description: "Experience lightning-fast nationwide delivery with DTDC's extensive network. We ensure your local parcels reach their destination safely and on time."
        },
        {
            icon: Globe,
            title: "International Courier",
            description: "Expand your reach globally. We offer expert customs handling and partnerships with major international carriers for seamless cross-border shipping."
        },
        {
            icon: Package,
            title: "Logistics & Bulk",
            description: "Optimized warehouse management and distribution for large-scale inventory. Tailored workflows to improve your supply chain efficiency."
        },
        {
            icon: Truck,
            title: "Transport Services",
            description: "Ground freight solutions for bulky and heavy items. Full truckload (FTL) and less than truckload (LTL) options available for all distances."
        },
        {
            icon: MapPin,
            title: "Door-to-Door Delivery",
            description: "Complete peace of mind with end-to-end tracking. We pick up from your location and deliver directly to the recipient's doorstep."
        },
        {
            icon: Building2,
            title: "Business Shipments",
            description: "Specialized B2B logistics with priority handling, dedicated account management, and automated invoicing for corporate entities."
        }
    ];

    const stats = [
        { label: "Years of Excellence", value: "14+" },
        { label: "Countries Served", value: "240+" },
        { label: "Packages Delivered", value: "1M+" },
        { label: "Happy Clients", value: "10k+" }
    ];

    const commitments = [
        {
            icon: ShieldCheck,
            title: "Safe Handling",
            description: "We treat every shipment with the utmost care. Our multi-layer checking process ensures that fragile items and important documents arrive exactly as they left."
        },
        {
            icon: Clock,
            title: "Punctual Delivery",
            description: "Time is money. Our logistics network is optimized for the fastest possible transit times, ensuring your business never misses a deadline."
        },
        {
            icon: Headset,
            title: "Customer Support",
            description: "Our relationship doesn't end at booking. Our dedicated support team is available to assist you with tracking queries and resolution management."
        }
    ];

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const result = await sendEvergreenInquiry(formData);
            if (result.success) {
                setStatus('success');
                setFormData({ name: '', email: '', phone: '', message: '' });
                // Reset success message after 5 seconds
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                setStatus('error');
                setTimeout(() => setStatus('idle'), 5000);
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#f6f8f6] dark:bg-[#102216] scroll-smooth">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#102216]/90 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        {/* Logo Section */}
                        <Link href="#home" className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#13ec5b] text-[#102216]">
                                <Truck className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black leading-none tracking-tight text-[#004b91] dark:text-white uppercase">Evergreen</span>
                                <span className="text-[10px] font-bold tracking-widest text-[#ed1c24] uppercase">Enterprises</span>
                            </div>
                        </Link>

                        {/* Navigation Links */}
                        <nav className="hidden md:flex items-center gap-8">
                            <Link href="#home" className="text-sm font-semibold hover:text-[#13ec5b] transition-colors">Home</Link>
                            <Link href="#services" className="text-sm font-semibold hover:text-[#13ec5b] transition-colors">Services</Link>
                            <Link href="#about" className="text-sm font-semibold hover:text-[#13ec5b] transition-colors">About Us</Link>
                            <Link href="#contact" className="text-sm font-semibold hover:text-[#13ec5b] transition-colors">Contact</Link>
                        </nav>

                        {/* Header Actions */}
                        <div className="flex items-center gap-4">
                            <a href="tel:9840722108" className="hidden sm:flex items-center gap-2 rounded-lg bg-[#13ec5b] px-5 py-2.5 text-sm font-bold text-[#102216] hover:brightness-110 transition-all shadow-sm">
                                <Phone className="h-4 w-4" />
                                <span>Call Now</span>
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                {/* Hero Section */}
                <section id="home" className="relative h-[650px] w-full overflow-hidden flex items-center bg-cover bg-center"
                    style={{ backgroundImage: "linear-gradient(rgba(16, 34, 22, 0.7), rgba(16, 34, 22, 0.5)), url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920')" }}>
                    <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[#13ec5b]/20 px-4 py-1.5 mb-6 backdrop-blur-sm border border-[#13ec5b]/30">
                                <span className="flex h-2 w-2 rounded-full bg-[#13ec5b] animate-pulse"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#13ec5b]">Authorized DTDC Partner</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl mb-6">
                                Fast • Secure • Reliable <br />
                                <span className="text-[#13ec5b]">Courier Solutions</span>
                            </h1>
                            <p className="text-lg text-slate-200 mb-10 max-w-2xl leading-relaxed">
                                Evergreen Enterprises: Your Trusted Authorized DTDC Courier & Logistics Partner for Nationwide Delivery. We handle your documents and parcels with precision.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <Link href="#contact" className="w-full sm:w-auto min-w-[200px] rounded-lg bg-[#13ec5b] px-8 py-4 text-base font-bold text-[#102216] hover:scale-105 transition-transform text-center shadow-lg">
                                    Ship Your Parcel
                                </Link>
                                <Link href="#about" className="w-full sm:w-auto min-w-[200px] rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-bold text-white hover:bg-white/20 transition-all text-center">
                                    Learn More
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services" className="py-24 bg-[#f6f8f6] dark:bg-[#102216]">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-2 mb-16 text-center">
                            <h2 className="text-3xl font-black tracking-tight text-[#0d1b12] dark:text-white sm:text-5xl">Our Logistics Services</h2>
                            <div className="h-1.5 w-24 bg-[#13ec5b] mx-auto rounded-full mt-2"></div>
                            <p className="text-gray-600 dark:text-gray-400 mt-6 max-w-2xl mx-auto">Discover our range of professional courier and logistics services designed to keep your business moving.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {services.map((service, index) => (
                                <div key={index} className="group flex flex-col gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#13ec5b]/10 text-[#13ec5b] transition-colors group-hover:bg-[#13ec5b] group-hover:text-white">
                                        <service.icon className="h-8 w-8" />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <h3 className="text-xl font-bold">{service.title}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                            {service.description}
                                        </p>
                                        <Link href="#contact" className="mt-2 text-[#13ec5b] text-sm font-bold flex items-center gap-1 group/link">
                                            Get Quote <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className="py-24 bg-white dark:bg-slate-950/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="flex flex-col gap-6">
                                <div className="inline-flex items-center gap-2 text-[#13ec5b]">
                                    <Verified className="h-5 w-5" />
                                    <span className="font-bold uppercase tracking-widest text-sm">Authorized DTDC Partner</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black leading-tight text-slate-900 dark:text-white">Our Story & Strategic Mission</h2>
                                <div className="space-y-4 text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed">
                                    <p>Founded in 2010, Evergreen Enterprises was born out of a vision to bridge the gap between complex logistics and customer convenience. Starting as a local courier center, we have grown exponentially through our strategic partnership with DTDC, India's leading logistics network.</p>
                                    <p>As an authorized DTDC partner, we leverage state-of-the-art infrastructure and advanced tracking technologies to provide seamless delivery solutions. Our mission is to provide efficient, transparent, and secure logistics services that empower businesses and connect people globally.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                                    {stats.map((stat, i) => (
                                        <div key={i}>
                                            <p className="text-3xl font-black text-[#13ec5b]">{stat.value}</p>
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#13ec5b]/10 rounded-full blur-3xl"></div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#13ec5b]/20 rounded-full blur-3xl"></div>
                                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white dark:border-slate-800">
                                    <img src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1000" alt="Logistics delivery trucks" className="w-full h-auto object-cover aspect-[4/3] hover:scale-105 transition-transform duration-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Commitment Section */}
                <section className="py-24 bg-[#f6f8f6] dark:bg-[#102216]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-6">Our Commitment to Excellence</h2>
                            <div className="h-1 w-20 bg-[#13ec5b] mx-auto rounded-full mb-8"></div>
                            <p className="text-slate-500 dark:text-slate-400 text-lg">At the core of Evergreen Enterprises is a promise to our customers. We don't just move boxes; we move trust, importance, and value.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {commitments.map((item, i) => (
                                <div key={i} className="group p-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#13ec5b]/50 transition-all duration-300 shadow-sm hover:shadow-2xl">
                                    <div className="w-16 h-16 bg-[#13ec5b]/10 text-[#13ec5b] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                        <item.icon className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4 dark:text-white">{item.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section id="contact" className="py-24 bg-white dark:bg-slate-950/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-16">
                            {/* Contact Form */}
                            <div className="bg-slate-50 dark:bg-slate-900 p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5">
                                <h2 className="text-3xl font-black mb-2">Get in Touch</h2>
                                <p className="text-[#4c9a66] mb-8 font-medium">Ready to ship? Send us a message for quick assistance.</p>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 p-4 text-base focus:ring-2 focus:ring-[#13ec5b] focus:border-transparent outline-none transition-all"
                                            placeholder="Enter your full name"
                                            type="text"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                                            <input
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 p-4 text-base focus:ring-2 focus:ring-[#13ec5b] focus:border-transparent outline-none transition-all"
                                                placeholder="email@example.com"
                                                type="email"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                                            <input
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                required
                                                className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 p-4 text-base focus:ring-2 focus:ring-[#13ec5b] focus:border-transparent outline-none transition-all"
                                                placeholder="+91 00000 00000"
                                                type="tel"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Message</label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 p-4 text-base focus:ring-2 focus:ring-[#13ec5b] focus:border-transparent outline-none transition-all resize-none"
                                            placeholder="How can we help you?"
                                            rows={4}
                                        ></textarea>
                                    </div>

                                    <button
                                        disabled={status === 'loading' || status === 'success'}
                                        type="submit"
                                        className={`mt-2 font-black py-4 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 ${status === 'success'
                                                ? 'bg-green-600 text-white cursor-default'
                                                : 'bg-[#13ec5b] text-[#102216] hover:brightness-105 hover:scale-[1.02]'
                                            }`}
                                    >
                                        {status === 'loading' ? (
                                            <>
                                                <span>Sending...</span>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            </>
                                        ) : status === 'success' ? (
                                            <>
                                                <span>Sent Successfully</span>
                                                <CheckCircle className="h-5 w-5" />
                                            </>
                                        ) : status === 'error' ? (
                                            <>
                                                <span>Retry sending</span>
                                                <Send className="h-5 w-5" />
                                            </>
                                        ) : (
                                            <>
                                                <span>Send Inquiry</span>
                                                <Send className="h-5 w-5" />
                                            </>
                                        )}
                                    </button>
                                    {status === 'error' && (
                                        <p className="text-red-500 text-center font-bold">Something went wrong. Please try again.</p>
                                    )}
                                </form>
                            </div>

                            {/* Contact Info & Map */}
                            <div className="flex flex-col gap-10 justify-center">
                                <div className="grid sm:grid-cols-2 gap-8">
                                    <div className="bg-[#13ec5b]/10 p-8 rounded-2xl flex flex-col gap-4 border border-[#13ec5b]/20">
                                        <div className="w-12 h-12 bg-[#13ec5b] rounded-full flex items-center justify-center text-[#102216] shadow-md shadow-[#13ec5b]/30">
                                            <Phone className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#4c9a66] uppercase tracking-wider mb-1">Call Support</p>
                                            <a href="tel:9840722108" className="text-2xl font-black text-slate-800 dark:text-white hover:text-[#13ec5b] transition-colors">9840722108</a>
                                        </div>
                                    </div>

                                    <div className="bg-[#13ec5b]/10 p-8 rounded-2xl flex flex-col gap-4 border border-[#13ec5b]/20">
                                        <div className="w-12 h-12 bg-[#13ec5b] rounded-full flex items-center justify-center text-[#102216] shadow-md shadow-[#13ec5b]/30">
                                            <Mail className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#4c9a66] uppercase tracking-wider mb-1">Email Inquiry</p>
                                            <a href="mailto:korattur.che@fr.dtdc.com" className="text-lg font-black text-slate-800 dark:text-white hover:text-[#13ec5b] transition-colors break-all leading-tight">korattur.che@fr.dtdc.com</a>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-800 aspect-video group">
                                    <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800" alt="Korattur, Chennai map" className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl flex items-center gap-4 max-w-[90%]">
                                            <div className="w-12 h-12 bg-[#13ec5b] rounded-full flex items-center justify-center text-[#102216] shrink-0">
                                                <MapPin className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-slate-800 dark:text-white">Evergreen Enterprises</p>
                                                <p className="text-xs text-[#4c9a66] font-bold leading-relaxed">
                                                    NO.20, TVS NAGAR, 1ST MAIN ROAD,<br />
                                                    KORATTUR NORTH, BEHIND DRJ HOSPITAL,<br />
                                                    CHENNAI, TAMIL NADU, 600076
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-6 lg:px-40 py-16">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#13ec5b] text-[#102216]">
                                <Truck className="h-6 w-6" />
                            </div>
                            <span className="text-2xl font-black text-[#004b91] dark:text-white uppercase">Evergreen</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                            Authorized DTDC Partner providing world-class logistics and courier solutions since 2010. Your success is our delivery mission.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-black text-lg uppercase tracking-wider text-slate-800 dark:text-white">Corporate Partner</h4>
                        <div className="bg-[#f6f8f6] dark:bg-slate-900 p-6 rounded-2xl flex items-center gap-4 border border-[#cfe7d7] dark:border-white/5">
                            <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-2xl text-blue-900 italic">DTDC</div>
                            <div>
                                <p className="text-sm font-black text-slate-800 dark:text-white uppercase">Authorized Partner</p>
                                <p className="text-xs text-[#4c9a66] font-bold">Logistics Excellence Since 1990</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-black text-lg uppercase tracking-wider text-slate-800 dark:text-white">Contact Info</h4>
                        <div className="space-y-4">
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                                NO.20, TVS NAGAR, 1ST MAIN ROAD,<br />
                                KORATTUR NORTH, BEHIND DRJ HOSPITAL,<br />
                                CHENNAI, TAMIL NADU, 600076
                            </p>
                            <div className="flex flex-col gap-2">
                                <a href="tel:9840722108" className="text-[#13ec5b] font-black text-xl hover:underline">9840722108</a>
                                <a href="mailto:korattur.che@fr.dtdc.com" className="text-slate-500 hover:text-[#13ec5b] transition-colors font-bold break-all">korattur.che@fr.dtdc.com</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">
                    © 2024 Evergreen Enterprises. All rights reserved. Partner of DTDC Courier & Logistics.
                </div>
            </footer>

            {/* Floating WhatsApp Button */}
            <a
                className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 rounded-full bg-[#25D366] p-5 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300"
                href="https://wa.me/919840722108"
                target="_blank"
                rel="noopener noreferrer"
            >
                <svg className="h-8 w-8 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="font-black pr-2 hidden sm:block">Support</span>
            </a>
        </div>
    );
}
