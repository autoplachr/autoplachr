"use client";
import { ChevronDown, Search } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CAR_MAKES } from "../data/car-catalog";
import { normalizeLocation } from "../data/croatia-locations";
import { BrandLogo } from "./BrandLogo";

export function BrandSelect({ value, onChange, required=false, className="" }: {
  value:string; onChange:(make:string)=>void; required?:boolean; className?:string;
}) {
  const id=useId(), trigger=useRef<HTMLButtonElement>(null), popover=useRef<HTMLDivElement>(null), search=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState(""), [cursor,setCursor]=useState(0), [expanded,setExpanded]=useState(false), [invalid,setInvalid]=useState(false);
  const placeholder=required ? "Odaberite marku" : "Sve marke";
  const needle=normalizeLocation(query).replace(/[^\p{L}\d]/gu,"");
  const items=[...(!required&&!needle ? [""] : []),...CAR_MAKES.filter(make=>normalizeLocation(make).replace(/[^\p{L}\d]/gu,"").includes(needle))];
  function open() {
    const button=trigger.current, panel=popover.current;
    if(!button || !panel) return;
    if(panel.matches(":popover-open")) {panel.hidePopover();return;}
    const rect=button.getBoundingClientRect();
    const width=Math.min(Math.max(rect.width,220),innerWidth-16);
    const below=innerHeight-rect.bottom;
    const above=rect.top;
    Object.assign(panel.style,{
      width:width+"px", left:Math.max(8,Math.min(rect.left,innerWidth-width-8))+"px",
      top:below>=Math.min(above,340) ? rect.bottom+4+"px" : "auto",
      bottom:below>=Math.min(above,340) ? "auto" : innerHeight-rect.top+4+"px",
      maxHeight:Math.max(96,Math.min(340,Math.max(below,above)-12))+"px",
    });
    setQuery("");setCursor(0);panel.showPopover();setExpanded(true);search.current?.focus();
  }
  function choose(make:string) {
    onChange(make);setInvalid(false);popover.current?.hidePopover();trigger.current?.focus();
  }
  function keys(event:KeyboardEvent<HTMLInputElement>) {
    if (event.key==="Escape") {event.preventDefault();event.stopPropagation();popover.current?.hidePopover();trigger.current?.focus();return;}
    if(event.key==="Enter") {event.preventDefault();if(items[cursor]!==undefined) choose(items[cursor]);return;}
    if(event.key==="ArrowDown" || event.key==="ArrowUp") {
      event.preventDefault();
      if(!items.length) return;
      const next=(cursor+items.length+(event.key==="ArrowDown" ? 1 : -1))%items.length;
      setCursor(next);document.getElementById(id+"-"+next)?.scrollIntoView({block:"nearest"});
    }
  }
  return <div className={"field brand-select "+className}>
    <span id={id+"-label"}>Marka</span>
    <button ref={trigger} type="button" className="brand-select-trigger" aria-labelledby={id+"-label "+id+"-value"} aria-haspopup="listbox" aria-expanded={expanded} aria-controls={id+"-list"} aria-invalid={invalid} onClick={open}>
      {value && <BrandLogo make={value} size="xs"/>}<span id={id+"-value"}>{value || placeholder}</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    {required && <input className="brand-required" type="text" tabIndex={-1} aria-hidden="true" required value={value} onChange={()=>undefined} onInvalid={event=>{
      event.preventDefault();setInvalid(true);trigger.current?.focus();
    }}/>}
    {invalid && <small className="field-issue" role="alert">Odaberite marku vozila.</small>}
    <div ref={popover} className="brand-select-popover" popover="auto" onToggle={event=>setExpanded(event.newState==="open")} onKeyDown={event=>{
      if(event.key==="Tab") popover.current?.hidePopover();
    }}>
      <div className="brand-select-search"><Search size={16} aria-hidden="true"/>
        <input ref={search} type="text" role="combobox" aria-label="Pretraži marke" autoComplete="off" aria-expanded={expanded} aria-controls={id+"-list"}
          aria-activedescendant={items.length ? id+"-"+cursor : undefined}
          value={query} onChange={event=>{setQuery(event.target.value);setCursor(0);}} onKeyDown={keys}/>
      </div>
      <ul id={id+"-list"} role="listbox" aria-label="Marke vozila">
        {expanded && items.map((make,index)=><li key={make} id={id+"-"+index} role="option" aria-selected={make===value}
          data-active={index===cursor} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(make)}>
          {make && <BrandLogo make={make} size="xs"/>}<span>{make || placeholder}</span>
        </li>)}
      </ul>
      {expanded && items.length===0 && <p className="brand-select-empty" role="status">Nema rezultata.</p>}
    </div>
  </div>;
}
