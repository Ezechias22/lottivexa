'use client';

import styles from './system-health-dashboard.module.css';

type HealthData = {
  status?: string;
  api?: { uptimeSeconds?: number; rssBytes?: number };
  database?: { ready?: boolean; latencyMs?: number };
  redis?: { ready?: boolean; latencyMs?: number };
  storage?: { writable?: boolean; path?: string; freeBytes?: number; totalBytes?: number };
  queues?: Record<string, number>;
  scheduler?: Array<{ name?: string; owner?: string; lockedUntil?: string }>;
};

const duration = (seconds = 0) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}j ${hours}è` : hours ? `${hours}è ${minutes}min` : `${minutes}min`;
};

const bytes = (value = 0) => {
  if (!Number.isFinite(value) || value <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
};

function State({ ready }: { ready: boolean }) {
  return <span className={ready ? styles.ok : styles.bad}><i />{ready ? 'Disponib' : 'Pa disponib'}</span>;
}

export default function SystemHealthDashboard({ data }: { data: HealthData }) {
  const healthy = data.status?.toUpperCase() === 'HEALTHY';
  const queueEntries = Object.entries(data.queues ?? {});
  return (
    <div className={styles.dashboard}>
      <section className={`${styles.banner} ${healthy ? styles.healthy : styles.degraded}`}>
        <div><p>Sante platfòm nan</p><h2>{healthy ? 'Tout sèvis yo fonksyone nòmalman' : 'Gen yon sèvis ki bezwen atansyon'}</h2></div>
        <strong><i />{healthy ? 'NÒMAL' : 'DEGRADE'}</strong>
      </section>

      <section className={styles.cards}>
        <article><span>API</span><State ready={true}/><b>Aktif depi {duration(data.api?.uptimeSeconds)}</b><small>Memwa: {bytes(data.api?.rssBytes)}</small></article>
        <article><span>Database</span><State ready={data.database?.ready === true}/><b>{data.database?.latencyMs ?? 0} ms</b><small>Tan repons</small></article>
        <article><span>Redis</span><State ready={data.redis?.ready === true}/><b>{data.redis?.latencyMs ?? 0} ms</b><small>{data.redis?.ready ? 'Kach ak mesaj pare' : 'REDIS_URL pa konekte'}</small></article>
        <article><span>Depo fichye</span><State ready={data.storage?.writable === true}/><b>{bytes(data.storage?.freeBytes)} lib</b><small>Sou {bytes(data.storage?.totalBytes)}</small></article>
      </section>

      {!data.redis?.ready && <section className={styles.warning}><strong>Redis pa konekte.</strong><span>API ak database la disponib. Redis rete opsyonèl pou enstalasyon Neon yo; mete REDIS_REQUIRED=true sèlman si w vle fè Redis obligatwa.</span></section>}

      <section className={styles.columns}>
        <article className={styles.panel}><header><div><p>Travay an fon</p><h2>Fil datant yo</h2></div><strong>{queueEntries.reduce((sum,[,value])=>sum+Number(value||0),0)}</strong></header>{queueEntries.length?<div className={styles.list}>{queueEntries.map(([name,value])=><div key={name}><span>{name.replace(/([A-Z])/g,' $1')}</span><b>{value}</b></div>)}</div>:<p className={styles.empty}>Pa gen travay an atant.</p>}</article>
        <article className={styles.panel}><header><div><p>Otomatizasyon</p><h2>Planifikatè</h2></div><strong>{data.scheduler?.length ?? 0}</strong></header>{data.scheduler?.length?<div className={styles.list}>{data.scheduler.map((job,index)=><div key={`${job.name}-${index}`}><span><b>{job.name}</b><small>Jiska {job.lockedUntil ? new Date(job.lockedUntil).toLocaleString('fr-FR') : '—'}</small></span><State ready={Boolean(job.owner)}/></div>)}</div>:<p className={styles.empty}>Pa gen travay planifye.</p>}</article>
      </section>
    </div>
  );
}
