
import React from 'react';
import { Profile } from '../types';

interface ProfileCardProps {
  profile: Profile;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  const getCleanUrl = (url?: string) => {
    if (!url) return '';
    let clean = url.trim().replace(/^["']|["']$/g, '');
    if (!clean) return '';
    if (clean.startsWith('http')) return clean;
    return `https://${clean}`;
  };

  const linkedinUrl = getCleanUrl(profile.linkedin_url);

  return (
    <div className={`bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border p-6 transition-all duration-300 group ${profile.score ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/10' : 'border-slate-800 hover:border-blue-500/30'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-xl font-bold text-slate-50 flex items-center gap-2 group-hover:text-blue-400 transition-colors truncate">
              <span className="text-2xl">👤</span> {profile.name}
            </h3>
            {profile.years_of_experience && (
              <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-md border border-blue-500/30 font-black whitespace-nowrap">
                {profile.years_of_experience} YRS EXP
              </span>
            )}
            {profile.score !== undefined && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md border border-emerald-500/30 font-black whitespace-nowrap">
                {Math.round(profile.score)}% MATCH
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 font-medium text-sm mt-1">
            <div className="flex items-center gap-1.5 truncate">
              {profile.title && (
                <>
                  <span className="text-blue-500">📌</span>
                  <span className="truncate max-w-[200px]">{profile.title}</span>
                </>
              )}
              {profile.title && profile.company && <span>at</span>}
              {profile.company && (
                <span className="text-slate-200 truncate max-w-[150px]">{profile.company}</span>
              )}
              {!profile.title && !profile.company && (
                <span className="italic opacity-50">Professional contact</span>
              )}
            </div>
            {profile.region && (
              <div className="flex items-center gap-1 text-xs text-slate-500 font-light border-l border-slate-800 pl-3">
                <span>📍</span>
                <span className="truncate">{profile.region}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
            profile.enrichment_status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 
            profile.enrichment_status === 'fallback' ? 'bg-amber-500/10 text-amber-400' :
            'bg-slate-800 text-slate-500'
          }`}>
            {profile.enrichment_source.replace('_', ' ')}
          </span>
        </div>
      </div>

      {profile.match_reason && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
          <p className="text-[11px] text-blue-300 italic font-medium leading-relaxed">
            <span className="font-black not-italic mr-1 text-blue-400">AGENTS NOTE:</span> {profile.match_reason}
          </p>
        </div>
      )}

      {profile.background && (
        <div className="mb-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Professional Background</h4>
          <p className="text-sm text-slate-300 leading-relaxed font-light line-clamp-3">{profile.background}</p>
        </div>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Expertise & Skills</h4>
          <div className="flex flex-wrap gap-2">
            {profile.skills.slice(0, 8).map((skill, i) => (
              <span key={i} className="bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg text-xs border border-slate-700">
                {skill}
              </span>
            ))}
            {profile.skills.length > 8 && <span className="text-[10px] text-slate-600 font-bold self-center">+{profile.skills.length - 8} more</span>}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/60">
        {linkedinUrl && (
          <a 
            href={linkedinUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            Connect
          </a>
        )}

        {profile.grounding_urls && profile.grounding_urls.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Sources:</span>
            <div className="flex gap-1.5">
              {profile.grounding_urls.slice(0, 3).map((link, idx) => (
                <a 
                  key={idx}
                  href={link.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded-md flex items-center justify-center text-[10px] border border-slate-700 transition-all"
                  title={link.title}
                >
                  🔗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
