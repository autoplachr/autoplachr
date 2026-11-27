"use client";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CAR_MAKES } from "../data/car-catalog";
import { normalizeSearchQuery } from "../lib/search-query";
import { BrandLogo } from "./BrandLogo";

export function BrandSelect({ value, onChange, required=false, className="", label="Marka",
  placeholder = required ? "Odaberite marku" : "Sve marke", searchLabel="Pretraži marke",
  options=CAR_MAKES, match, showLogo=true, disabled=false }: {
  value:string; onChange:(make:string)=>void; required?:boolean; className?:string;
  label?:string; placeholder?:string; searchLabel?:string; options?:readonly string[];
  match?:(option:string, query:string)=>boolean; showLogo?:boolean; disabled?:boolean;
}) {
  const id=useId(), trigger=useRef<HTMLButtonElement>(null), root=useRef<HTMLDivElement>(null), list=useRef<HTMLUListElement>(null), search=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState(""), [cursor,setCursor]=useState(0), [expanded,setExpanded]=useState(false), [invalid,setInvalid]=useState(false);
  const needle=normalizeSearchQuery(query).replace(/[^\p{L}\d]/gu,"");
  const items=[...(!required&&!needle ? [""] : []),...options.filter(option=>match ? match(option, query) : normalizeSearchQuery(option).replace(/[^\p{L}\d]/gu,"").includes(needle))];
  useEffect(() => {
    if (!expanded) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setExpanded(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  },[expanded]);

  function open() {
    if (expanded) {setExpanded(false);return;}
    setQuery("");setCursor(0);setExpanded(true);
    // Focusing in the click gesture keeps the keyboard available on iOS.
    const input=search.current;
    if (input) {
      input.closest<HTMLElement>(".brand-select-popover")?.removeAttribute("hidden");
      input.focus({preventScroll:true});
    }
  }
  function close(restoreFocus = false) {
    setExpanded(false);
    if (restoreFocus) trigger.current?.focus({preventScroll:true});
  }
  function choose(make:string) {
    onChange(make);setInvalid(false);close(true);
  }
  function keys(event:KeyboardEvent<HTMLInputElement>) {
    if (event.key==="Escape") {event.preventDefault();event.stopPropagation();close(true);return;}
    if(event.key==="Enter") {event.preventDefault();if(items[cursor]!==undefined) choose(items[cursor]);return;}
    if(event.key==="ArrowDown" || event.key==="ArrowUp") {
      event.preventDefault();
      if(!items.length) return;
      const next=(cursor+items.length+(event.key==="ArrowDown" ? 1 : -1))%items.length;
      setCursor(next);
      const option=document.getElementById(id+"-"+next), scroller=list.current;
      if (!option || !scroller) return;
      const optionBox=option.getBoundingClientRect(), scrollBox=scroller.getBoundingClientRect();
      if (optionBox.top < scrollBox.top) scroller.scrollTop -= scrollBox.top-optionBox.top;
      if (optionBox.bottom > scrollBox.bottom) scroller.scrollTop += optionBox.bottom-scrollBox.bottom;
    }
  }
  return <div ref={root} className={"field brand-select "+className} onBlur={event=>{
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
  }}>
    <span id={id+"-label"}>{label}</span>
    <button ref={trigger} type="button" disabled={disabled} className="brand-select-trigger" aria-labelledby={id+"-label "+id+"-value"} aria-haspopup="listbox" aria-expanded={expanded} aria-controls={id+"-list"} aria-invalid={invalid} onClick={open}>
      {showLogo && value && <BrandLogo make={value} size="xs"/>}<span id={id+"-value"}>{value || placeholder}</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    {required && <input className="brand-required" type="text" tabIndex={-1} aria-hidden="true" required disabled={disabled} value={value} onChange={()=>undefined} onInvalid={event=>{
      event.preventDefault();setInvalid(true);trigger.current?.focus({preventScroll:true});
    }}/>}
    {invalid && <small className="field-issue" role="alert">{placeholder}.</small>}
    <div className="brand-select-popover" hidden={!expanded}>
      <div className="brand-select-search"><Search size={16} aria-hidden="true"/>
        <input ref={search} type="text" role="combobox" aria-label={searchLabel} autoComplete="off" aria-expanded={expanded} aria-controls={id+"-list"}
          aria-activedescendant={items.length ? id+"-"+cursor : undefined}
          value={query} onChange={event=>{setQuery(event.target.value);setCursor(0);if(list.current) list.current.scrollTop=0;}} onKeyDown={keys}/>
      </div>
      <ul ref={list} id={id+"-list"} role="listbox" aria-label={label}>
        {expanded && items.map((make,index)=><li key={make} id={id+"-"+index} role="option" aria-selected={make===value}
          data-active={index===cursor} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(make)}>
          {showLogo && make && <BrandLogo make={make} size="xs"/>}<span>{make || placeholder}</span>
        </li>)}
      </ul>
      {expanded && items.length===0 && <p className="brand-select-empty" role="status">Nema rezultata.</p>}
    </div>
  </div>;
}
