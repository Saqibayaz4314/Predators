import { useEffect, useState } from 'react';
import { Layers, CircleHelp, LayoutDashboard, Map, Columns3, FileText, Database } from 'lucide-react';
import { App } from './App';
import { ThemeToggle } from './ThemeToggle';
import { mainRoutes, AppLink, usePath, resolveRoute, navigate } from './navigation';
import { useScreenData } from './screen-data';
import { LandingScreen } from './LandingScreen';
import { OverviewScreen } from './OverviewScreen';
import { DataScreen } from './DataScreen';
import { ReportsScreen } from './ReportsScreen';
import { ScenarioComparison } from './ScenarioComparison';
import { DataStatus, QueryNotice } from './ScreenState';
import { useWorkspace } from './workspace-store';
const icons=[LayoutDashboard,Map,Columns3,FileText,Database];
export function Application({apiBaseUrl}:{apiBaseUrl:string}) {
 const pathname=usePath();const route=resolveRoute(pathname);const path=route?.path;
 const [workspaceVisited,setWorkspaceVisited]=useState(path==='/workspace');
 const data=useScreenData(apiBaseUrl, path !== '/');const state=useWorkspace();
 useEffect(()=>{if(path==='/workspace')setWorkspaceVisited(true);document.title=(route?.title??'Page not found')+' — ATLAS Flood Digital Twin';window.scrollTo(0,0);},[path,route]);
 return <div className="atlas-application"><a className="skip-link" href={path==='/'?'#landing-content':'#app-content'}>Skip to page content</a>{path!=='/'&&<><header className="application-header"><div className="application-header-row"><AppLink className="brand" href="/" aria-label="ATLAS product home"><Layers size={27} strokeWidth={1.6}/><span>ATLAS<span className="wordmark">FLOOD DIGITAL TWIN</span></span></AppLink><span className="application-study">{data.area?.name??'Geospatial operations console'}</span><div className="header-actions"><span className="phase-label">SIMULATION MODE</span><ThemeToggle/></div></div><nav className="main-navigation" aria-label="Main navigation">{mainRoutes.map((item,index)=>{const Icon=icons[index]!;return <AppLink key={item.path} href={item.path} aria-current={path===item.path?'page':undefined}><Icon size={16}/>{item.title}</AppLink>;})}</nav></header><div className="notice"><CircleHelp size={16}/><span>Simulation prototype. Hypothetical flood scenarios only. Not official evacuation guidance.</span></div></>}
 <div id="app-content" tabIndex={-1}>
 {workspaceVisited&&<div className="route-view workspace-route" hidden={path!=='/workspace'}><App apiBaseUrl={apiBaseUrl} embedded active={path==='/workspace'}/></div>}
 {path==='/'&&<LandingScreen/>}{path==='/overview'&&<div className="route-view"><OverviewScreen data={data}/></div>}
 {path==='/analysis'&&<main className="content-screen route-view analysis-screen"><div className="page-heading"><span className="eyebrow">IMPACT & ANALYSIS</span><h1>Compare disruption on the same network.</h1><p>Use the origin and destination selected in Flood Workspace. Compare hypothetical conditions without changing the original graph.</p></div><DataStatus data={data}/><QueryNotice busy={data.scenarios.isFetching} error={data.scenarios.error?.message} retry={()=>void data.scenarios.refetch()}/>{data.area&&data.scenarios.isSuccess&&<ScenarioComparison open onClose={()=>navigate('/workspace')} apiBaseUrl={apiBaseUrl} area={data.area} scenarios={data.scenarios.data?.scenarios??[]} origin={state.origin} destination={state.destination} onScenario={state.selectScenario} presentation="page"/>}</main>}
 {path==='/reports'&&<div className="route-view"><ReportsScreen data={data} apiBaseUrl={apiBaseUrl}/></div>}
 {path==='/about-data'&&<div className="route-view"><DataScreen data={data}/></div>}
 {!route&&<main className="content-screen route-view"><div className="page-heading"><span className="eyebrow">ATLAS NAVIGATION</span><h1>Page not found</h1><p>This address does not match an application screen.</p><AppLink className="screen-cta" href="/">Return to product home</AppLink></div></main>}
 </div>{path!=='/workspace'&&path!=='/'&&<footer className="application-footer"><span>ATLAS · Scenario analysis prototype</span><AppLink href="/about-data">OpenStreetMap-derived data / Sources & limitations</AppLink></footer>}</div>;
}
