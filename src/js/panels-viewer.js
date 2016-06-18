/*!
 * Panel Builder. Supports building the panels to be included in the modal or styleguide
 *
 * Copyright (c) 2013-16 Brad Frost, http://bradfrostweb.com & Dave Olsen, http://dmolsen.com
 * Licensed under the MIT license
 *
 * @requires panels.js
 * @requires url-handler.js
 */

var panelsViewer = {

  // set up some defaults
  targetOrigin: (window.location.protocol === 'file:') ? '*' : window.location.protocol+'//'+window.location.host,
  initCopy:     false,
  initMoveTo:   0,

  checkPanels: function(panels, patternData, iframePassback) {

    // count how many panels have rendered content
    var panelContentCount = 0;
    for (var i = 0; i < panels.length; ++i) {
      if (panels[i].content !== undefined) {
        panelContentCount++;
      }
    }
    
    // see if the count of panels with content matches number of panels
    if (panelContentCount === Panels.count()) {
      panelsViewer.renderPanels(panels, patternData, iframePassback);
    }

  },

  gatherPanels: function(patternData, iframePassback) {

    Dispatcher.addListener('checkPanels', panelsViewer.checkPanels);

    // set-up defaults
    var template, templateCompiled, templateRendered, panel;

    // get the base panels
    var panels = Panels.get();

    // evaluate panels array and create content
    for (var i = 0; i < panels.length; ++i) {

      panel = panels[i];

      if ((panel.templateID !== undefined) && (panel.templateID)) {

        if ((panel.httpRequest !== undefined) && (panel.httpRequest)) {

          // need a file and then render
          var fileName = urlHandler.getFileName(patternData.patternPartial);
          var e        = new XMLHttpRequest();
          e.onload     = (function(i, panels, patternData, iframeRequest) {
            return function() {
              prismedContent    = Prism.highlight(this.responseText, Prism.languages[panels[i].language]);
              template          = document.getElementById(panels[i].templateID);
              templateCompiled  = Hogan.compile(template.innerHTML);
              templateRendered  = templateCompiled.render({ 'language': panels[i].language, 'code': prismedContent });
              panels[i].content = templateRendered;
              Dispatcher.trigger('checkPanels', [panels, patternData, iframePassback]);
            };
          })(i, panels, patternData, iframePassback);
          e.open('GET', fileName.replace(/\.html/,panel.httpRequestReplace)+'?'+(new Date()).getTime(), true);
          e.send();

        } else {

          // vanilla render of pattern data
          template          = document.getElementById(panel.templateID);
          templateCompiled  = Hogan.compile(template.innerHTML);
          templateRendered  = templateCompiled.render(patternData);
          panels[i].content = templateRendered;
          Dispatcher.trigger('checkPanels', [panels, patternData, iframePassback]);

        }

      }

    }

  },

  renderPanels: function(panels, patternData, iframePassback) {
    
    // set-up defaults
    var template, templateCompiled, templateRendered;
    var annotation, comment, count, div, els, item, markup, i;
    var patternPartial = patternData.patternPartial;
    patternData.panels = panels;

    // set a default pattern description for modal pop-up
    if (!iframePassback && (patternData.patternDesc.length === 0)) {
      patternData.patternDesc = "There is no description for this pattern.";
    }
    
    // capitilize the pattern name
    patternData.patternNameCaps = patternData.patternName.toUpperCase();
    
    // check for annotations in the given mark-up
    markup           = document.createElement('div');
    markup.innerHTML = patternData.patternMarkup;
    
    count = 1;
    patternData.annotations = [];
    delete patternData['patternMarkup'];
    
    for (i = 0; i < comments.comments.length; ++i) {
      
      item = comments.comments[i];
      els  = markup.querySelectorAll(item.el);
      
      if (els.length > 0) {
        annotation = { 'displayNumber': count, 'el': item.el, 'title': item.title, 'comment': item.comment };
        patternData.annotations.push(annotation);
        count++;
      }
        
    }
    
    // alert the pattern that annotations should be highlighted
    if (patternData.annotations.length > 0) {
      var obj = JSON.stringify({ 'event': 'patternLab.annotationsHighlightShow', 'annotations': patternData.annotations });
      document.getElementById('sg-viewport').contentWindow.postMessage(obj, panelsViewer.targetOrigin);
    }
    
    // add hasComma property to lineage
    if (patternData.lineage.length > 0) {
      for (i = 0; i < patternData.lineage.length; ++i) {
        if (i < (patternData.lineage.length - 1)) {
          patternData.lineage[i].hasComma = true;
        }
      }
    }
    
    // add hasComma property to lineageR
    if (patternData.lineageR.length > 0) {
      for (i = 0; i < patternData.lineageR.length; ++i) {
        if (i < (patternData.lineageR.length - 1)) {
          patternData.lineageR[i].hasComma = true;
        }
      }
    }
    
    // add *Exists attributes for Hogan templates
    // figure out if the description exists
    patternData.patternDescExists = ((patternData.patternDesc.length > 0) || ((patternData.patternDescAdditions !== undefined) && (patternData.patternDescAdditions.length > 0)));
    
    // figure out if lineage should be drawn
    patternData.lineageExists = (patternData.lineage.length !== 0);

    // figure out if reverse lineage should be drawn
    patternData.lineageRExists = (patternData.lineageR.length !== 0);

    // figure out if pattern state should be drawn
    patternData.patternStateExists = (patternData.patternState.length > 0);

    // figure if the entire desc block should be drawn
    patternData.descBlockExists = (patternData.patternDescExists || patternData.lineageExists || patternData.lineageRExists || patternData.patternStateExists);
    
    // figure if annotations should be drawn
    patternData.annotationExists = (patternData.annotations.length > 0);

    // set isPatternView based on if we have to pass it back to the styleguide level
    patternData.isPatternView = (iframePassback === false);

    // render all of the panels in the base panel template
    template         = document.getElementById('pl-panel-template-base');
    templateCompiled = Hogan.compile(template.innerHTML);
    templateRendered = templateCompiled.render(patternData);

    // make sure templateRendered is modified to be an HTML element
    div              = document.createElement('div');
    div.className    = 'sg-modal-content-inner';
    div.innerHTML    = templateRendered;
    templateRendered = div;

    // add click events
    templateRendered = panelsUtil.addClickEvents(templateRendered, patternPartial);

    // add onclick events to the tabs in the rendered content
    for (i = 0; i < panels.length; ++i) {

      panel = panels[i];

      // default IDs
      panelTab   = '#sg-'+patternPartial+'-'+panel.id+'-tab';
      panelBlock = '#sg-'+patternPartial+'-'+panel.id+'-panel';

      // show default options
      if ((templateRendered.querySelector(panelTab) !== null) && (panel.default)) {
        templateRendered.querySelector(panelTab).classList.add('sg-tab-title-active');
        templateRendered.querySelector(panelBlock).style.display = 'block';
      }

    }

    // find lineage links in the rendered content and add postmessage handlers in case it's in the modal
    $('#sg-code-lineage-fill a, #sg-code-lineager-fill a', templateRendered).on('click', function(e){
      e.preventDefault();
      var obj = JSON.stringify({ 'event': 'patternLab.updatePath', 'path': urlHandler.getFileName($(this).attr('data-patternpartial')) });
      document.getElementById('sg-viewport').contentWindow.postMessage(obj, panelsViewer.targetOrigin);
    });

    // gather panels from plugins
    Dispatcher.trigger('insertPanels', [templateRendered, patternPartial, iframePassback]);

  },

  /**
  * select the some range to copy
  */
  select: function(id) {

    if ((modalViewer !== undefined) && (modalViewer.active)) {
      selection = window.getSelection();
      range = document.createRange();
      range.selectNodeContents(document.getElementById(id));
      selection.removeAllRanges();
      selection.addRange(range);
    }

  },

  /**
  * clear any selection of code when swapping tabs or opening a new pattern
  */
  clear: function() {

    if ((modalViewer !== undefined) && modalViewer.active) {
      if (window.getSelection().empty) {
        window.getSelection().empty();
      } else if (window.getSelection().removeAllRanges) {
        window.getSelection().removeAllRanges();
      }
    }

  }

};