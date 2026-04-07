import React from 'react';
import { Mail, Github, Linkedin, Globe, MapPin, Briefcase, GraduationCap, Award } from 'lucide-react';

export default function ProfileContact() {
  return (
    <div className="p-8 max-w-5xl mx-auto text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tight uppercase">Rahool Gir</h1>
          <p className="text-xl text-indigo-400 mt-2 font-medium">Senior Software Engineer</p>
          <div className="flex items-center gap-2 text-slate-400 mt-3">
            <MapPin className="w-4 h-4" />
            <span>Karachi, Pakistan</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <a href="mailto:rahool.goswami16@gmail.com" className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-indigo-600 transition">
            <Mail className="w-4 h-4" /> Email
          </a>
          <a href="https://github.com/Rahul-AlPHA1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-indigo-600 transition">
            <Github className="w-4 h-4" /> GitHub
          </a>
          <a href="https://www.linkedin.com/in/rahool-goswami-4b055a126/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-indigo-600 transition">
            <Linkedin className="w-4 h-4" /> LinkedIn
          </a>
          <a href="https://rahul-alpha1.github.io/RahoolPortfolio.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-indigo-600 transition">
            <Globe className="w-4 h-4" /> Portfolio
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Briefcase className="w-5 h-5 text-indigo-400" /> Experience
          </h2>
          <ul className="space-y-4 text-slate-400 text-sm">
            <li>
              <strong>Senior Software Design Engineer</strong> | TereSol PVT. LTD.
              <br/><span className="text-xs text-slate-500">July 2022 – Present</span>
            </li>
            <li>
              <strong>C# Developer (Trainee)</strong> | Media Monitors
              <br/><span className="text-xs text-slate-500">Jan 2021 – May 2021</span>
            </li>
            <li>
              <strong>Web Design Intern</strong> | Abtach PVT. LTD.
              <br/><span className="text-xs text-slate-500">Jun 2021 – Aug 2021</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <GraduationCap className="w-5 h-5 text-indigo-400" /> Education
          </h2>
          <p className="text-slate-400 text-sm font-medium">B.Sc. in Computer Science</p>
          <p className="text-slate-500 text-xs">Sindh Madressetul Islam University (SMIU), Karachi (2018 - 2022)</p>
        </div>

        <div className="md:col-span-2 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-indigo-400" /> Certifications
          </h2>
          <div className="flex flex-wrap gap-3">
            {['Java & DSA (Apna College)', 'Problem Solving (HackerRank)', 'SQL Advanced (HackerRank)'].map((cert) => (
              <span key={cert} className="px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-bold border border-indigo-500/20">
                {cert}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
