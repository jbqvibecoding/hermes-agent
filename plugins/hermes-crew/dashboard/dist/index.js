/**
 * Hermes Crew — the /crew dashboard surface.
 *
 * Three columns: the roster (who works here, grouped into the org chart), the
 * thread (an iMessage-shaped transcript of chips), and the teammate's computer
 * (its live screen over noVNC, plus the routines it runs).
 *
 * Plain IIFE, no build step — the same contract every other bundled dashboard
 * plugin in this repo follows (see plugins/kanban). React, the design-system
 * components and the authed fetch/WS helpers all come from
 * window.__HERMES_PLUGIN_SDK__, so this file ships no dependencies and a
 * contributor can edit it without npm.
 *
 * Everything the operator sees arrives over one WebSocket. Sends are
 * fire-and-forget 202s; the backend answers immediately and the reply shows up
 * as a chip when the turn produces one. That is why nothing here has a
 * "sending..." spinner.
 */
(function () {
  "use strict";

  var SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) return;

  var React = SDK.React;
  var h = React.createElement;
  var useState = SDK.hooks.useState;
  var useEffect = SDK.hooks.useEffect;
  var useRef = SDK.hooks.useRef;
  var useCallback = SDK.hooks.useCallback;

  var API = "/api/plugins/hermes-crew";

  function api(path, init) {
    return SDK.fetchJSON(API + path, init);
  }

  function post(path, body) {
    return api(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
  }

  // -------------------------------------------------------------------------
  // Previews — a message kind rendered as its completion state.
  //
  // Ported from OpenGrokBot's Sidebar.preview(). This is the line that makes
  // scanning the roster equivalent to walking past everyone's desk: you read
  // what each teammate finished, not the last thing it happened to type.
  // -------------------------------------------------------------------------

  function preview(conversation) {
    var m = conversation.last_message;
    if (!m) return conversation.kind === "group" ? "Ask the room." : "Say hi — first briefing.";
    var p = m.payload || {};
    switch (m.kind) {
      case "screenshot":
        return p.caption ? "📷 " + p.caption : "📷 Screenshot";
      case "approval_request":
        return "⏸ Needs you: " + (p.action || "an action");
      case "approval_resolved":
        return (p.status === "approved" ? "✓ " : "✕ ") + (p.action || "decided");
      case "memory_updated":
        return "🧠 " + (p.rule || "Memory updated");
      case "routine_created":
        return "🕐 " + (p.name || "Routine created");
      case "bot_ref":
        return "↪ from @" + (p.from_name || "a teammate");
      case "login_request":
        return "🔑 Sign in to " + (p.site || "a site");
      case "report":
        if (p.closing) return p.closing;
        if (p.lines && p.lines.length) return "✓ " + p.lines[0].system + " → " + p.lines[0].result;
        return "Report filed.";
      default:
        return m.content || "";
    }
  }

  // -------------------------------------------------------------------------
  // Chips
  // -------------------------------------------------------------------------

  function Chip(props) {
    return h(
      "div",
      { className: "crew-chip " + (props.kind || "") },
      props.label ? h("div", { className: "crew-chip-label" }, props.label) : null,
      props.children
    );
  }

  function ReportChip(props) {
    var p = props.payload || {};
    return h(
      Chip,
      { kind: "report" },
      (p.lines || []).map(function (line, i) {
        return h(
          "div",
          { className: "crew-report-line", key: i },
          h("span", { className: "crew-report-check" }, "✓"),
          h("span", { className: "crew-report-system" }, line.system),
          h("span", { className: "crew-report-arrow" }, "→"),
          h(
            "span",
            null,
            line.result,
            line.count ? h("span", { className: "crew-report-count" }, " · " + line.count) : null
          )
        );
      }),
      p.closing ? h("div", { className: "crew-report-closing" }, p.closing) : null
    );
  }

  function ApprovalChip(props) {
    var p = props.payload || {};
    var resolved = p.status === "approved" || p.status === "discarded";
    return h(
      "div",
      { className: "crew-chip approval" + (resolved ? " resolved" : "") },
      h("div", { className: "crew-chip-label" }, resolved ? "Decided" : "Needs you"),
      h("div", { className: "crew-approval-action" }, p.action),
      p.detail ? h("div", { className: "crew-approval-detail" }, p.detail) : null,
      resolved
        ? h(
            "div",
            { className: "crew-approval-outcome" },
            p.status === "approved" ? "Approved" : "Discarded"
          )
        : h(
            "div",
            { className: "crew-approval-buttons" },
            h(
              "button",
              {
                className: "crew-btn primary",
                onClick: function () {
                  props.onDecide(p.approval_id, "approve");
                },
              },
              "Approve"
            ),
            h(
              "button",
              {
                className: "crew-btn danger",
                onClick: function () {
                  props.onDecide(p.approval_id, "discard");
                },
              },
              "Discard"
            )
          )
    );
  }

  function MemoryChip(props) {
    var p = props.payload || {};
    return h(
      Chip,
      { label: "Memory updated" },
      h("div", { className: "crew-memory-rule" }, p.rule),
      p.diff ? h("pre", { className: "crew-memory-diff" }, p.diff) : null
    );
  }

  function RoutineChip(props) {
    var p = props.payload || {};
    return h(
      Chip,
      { label: "Routine created" },
      h("div", { className: "crew-routine-name" }, "🕐 " + (p.name || "")),
      h("div", { className: "crew-routine-when" }, p.human || p.cron || "")
    );
  }

  function BotRefChip(props) {
    var p = props.payload || {};
    return h(
      Chip,
      { label: "Handed over by @" + (p.from_name || p.from || "a teammate") },
      h("div", { className: "crew-botref-body" }, p.content)
    );
  }

  function LoginChip(props) {
    var p = props.payload || {};
    return h(
      Chip,
      { label: "Needs you at the keyboard" },
      h("div", { className: "crew-login-site" }, "Sign in to " + (p.site || "a site")),
      p.why ? h("div", { className: "crew-login-why" }, p.why) : null,
      h("button", { className: "crew-btn", onClick: props.onOpenScreen }, "Open its screen")
    );
  }

  function ScreenshotChip(props) {
    var p = props.payload || {};
    return h(
      "figure",
      { className: "crew-shot" },
      h("img", { src: p.url, alt: p.caption || "the teammate's screen", loading: "lazy" }),
      p.caption ? h("figcaption", null, p.caption) : null
    );
  }

  function ResolvedChip(props) {
    var p = props.payload || {};
    return h(
      Chip,
      { label: "You decided" },
      h(
        "div",
        null,
        (p.status === "approved" ? "✓ Approved: " : "✕ Discarded: ") + (p.action || "")
      )
    );
  }

  function renderBody(message, handlers) {
    switch (message.kind) {
      case "report":
        return h(ReportChip, { payload: message.payload });
      case "approval_request":
        return h(ApprovalChip, { payload: message.payload, onDecide: handlers.onDecide });
      case "approval_resolved":
        return h(ResolvedChip, { payload: message.payload });
      case "memory_updated":
        return h(MemoryChip, { payload: message.payload });
      case "routine_created":
        return h(RoutineChip, { payload: message.payload });
      case "bot_ref":
        return h(BotRefChip, { payload: message.payload });
      case "login_request":
        return h(LoginChip, { payload: message.payload, onOpenScreen: handlers.onOpenScreen });
      case "screenshot":
        return h(ScreenshotChip, { payload: message.payload });
      default:
        return h("div", { className: "crew-bubble" }, message.content);
    }
  }

  // -------------------------------------------------------------------------
  // Roster
  // -------------------------------------------------------------------------

  function Roster(props) {
    var byId = {};
    props.conversations.forEach(function (c) {
      byId[c.id] = c;
    });

    function row(conversation) {
      if (!conversation) return null;
      var botId = conversation.members && conversation.members.length === 1 ? conversation.members[0] : null;
      var working = botId && props.statuses[botId] === "thinking";
      return h(
        "button",
        {
          key: conversation.id,
          className: "crew-row" + (props.selectedId === conversation.id ? " selected" : ""),
          onClick: function () {
            props.onSelect(conversation.id);
          },
        },
        h("span", { className: "crew-avatar" }, conversation.emoji),
        h(
          "span",
          { className: "crew-row-main" },
          h(
            "span",
            { className: "crew-row-top" },
            h("span", { className: "crew-row-name" }, conversation.title),
            working ? h("span", { className: "crew-dot", title: "working" }) : null
          ),
          h("span", { className: "crew-row-preview" }, preview(conversation))
        )
      );
    }

    var groups = props.conversations.filter(function (c) {
      return c.kind === "group";
    });

    return h(
      "div",
      { className: "crew-col crew-roster" },
      h(
        "div",
        { className: "crew-col-head" },
        h("span", null, "Crew"),
        h("button", { className: "crew-btn", onClick: props.onHire, title: "Hire a teammate" }, "+")
      ),
      h(
        "div",
        { className: "crew-col-body" },
        props.sections.map(function (section) {
          var members = section.bot_ids
            .map(function (id) {
              return byId["dm:" + id];
            })
            .filter(Boolean);
          if (!members.length) return null;
          var collapsed = !!props.collapsed[section.id];
          return h(
            "div",
            { key: section.id },
            props.sections.length > 1
              ? h(
                  "button",
                  {
                    className: "crew-section-head",
                    onClick: function () {
                      props.onToggleSection(section.id);
                    },
                  },
                  h("span", { className: "crew-chevron" + (collapsed ? " collapsed" : "") }, "▾"),
                  section.name || "Unassigned"
                )
              : null,
            collapsed ? null : members.map(row)
          );
        }),
        groups.length
          ? h(
              "div",
              null,
              h("div", { className: "crew-section-head", style: { cursor: "default" } }, "Rooms"),
              groups.map(row)
            )
          : null
      )
    );
  }

  // -------------------------------------------------------------------------
  // Thread
  // -------------------------------------------------------------------------

  function Thread(props) {
    var bottom = useRef(null);
    var draft = useState("");
    var value = draft[0];
    var setValue = draft[1];

    useEffect(
      function () {
        if (bottom.current && bottom.current.scrollIntoView) {
          bottom.current.scrollIntoView({ block: "end" });
        }
      },
      [props.messages.length, props.threadId]
    );

    function send() {
      var body = value.trim();
      if (!body) return;
      setValue("");
      props.onSend(body);
    }

    var conversation = props.conversation || {};
    return h(
      "div",
      { className: "crew-col" },
      h(
        "div",
        { className: "crew-col-head" },
        h(
          "span",
          null,
          (conversation.emoji || "") + " " + (conversation.title || ""),
          conversation.subtitle
            ? h(
                "span",
                { style: { fontWeight: 400, opacity: 0.7, marginLeft: "0.5rem" } },
                conversation.subtitle
              )
            : null
        ),
        conversation.kind === "dm"
          ? h("button", { className: "crew-btn", onClick: props.onOpenScreen }, "🖥️ Computer")
          : null
      ),
      h(
        "div",
        { className: "crew-col-body crew-thread" },
        props.messages.map(function (message) {
          var fromUser = message.sender === "user";
          var who = fromUser ? "You" : props.nameOf(message.sender);
          return h(
            "div",
            { key: message.id, className: "crew-msg" + (fromUser ? " from-user" : "") },
            h("div", { className: "crew-msg-who" }, who),
            renderBody(message, props.handlers)
          );
        }),
        h("div", { ref: bottom })
      ),
      h(
        "div",
        { className: "crew-composer" },
        h("textarea", {
          value: value,
          placeholder:
            conversation.kind === "group"
              ? "Ask the room…"
              : "Give " + (conversation.title || "them") + " some work…",
          onChange: function (e) {
            setValue(e.target.value);
          },
          onKeyDown: function (e) {
            // Enter sends, Shift+Enter breaks the line — the chat convention.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          },
        }),
        h("button", { className: "crew-btn primary", onClick: send }, "Send")
      )
    );
  }

  // -------------------------------------------------------------------------
  // Computer panel
  // -------------------------------------------------------------------------

  function ComputerPanel(props) {
    var info = props.info || {};
    return h(
      "div",
      { className: "crew-col crew-panel" },
      h(
        "div",
        { className: "crew-col-head" },
        h("span", null, "Its computer"),
        h("button", { className: "crew-btn", onClick: props.onClose }, "✕")
      ),
      h(
        "div",
        { className: "crew-col-body" },
        info.vnc_url
          ? h("iframe", {
              className: "crew-screen",
              title: "the teammate's screen",
              src: info.vnc_url + "/vnc.html?autoconnect=1&resize=scale&reconnect=1",
            })
          : h(
              "div",
              { className: "crew-panel-note" },
              info.error ||
                (info.running
                  ? "Starting its screen…"
                  : "Its computer is not running yet. It starts the first time this teammate uses a tool — or press Start below.")
            ),
        !info.vnc_url
          ? h(
              "div",
              { className: "crew-panel-note" },
              h("button", { className: "crew-btn", onClick: props.onStart }, "Start its computer")
            )
          : h(
              "div",
              { className: "crew-panel-note" },
              "This is its real screen. Take the wheel to sign in to a site — the session stays in its browser afterwards. Bound to 127.0.0.1; do not port-forward it."
            ),
        h("div", { className: "crew-col-head" }, "Routines"),
        (info.routines || []).length
          ? (info.routines || []).map(function (routine) {
              return h(
                "div",
                { className: "crew-routine-row", key: routine.id },
                h("span", null, routine.name),
                h("span", { className: "when" }, routine.human || routine.cron)
              );
            })
          : h("div", { className: "crew-panel-note" }, "Nothing scheduled yet.")
      )
    );
  }

  // -------------------------------------------------------------------------
  // Hire + onboarding
  // -------------------------------------------------------------------------

  function HireModal(props) {
    var nameState = useState("");
    var roleState = useState("");
    var busyState = useState(false);
    var errorState = useState("");

    function submit() {
      if (!nameState[0].trim() || busyState[0]) return;
      busyState[1](true);
      errorState[1]("");
      post("/bots", { name: nameState[0], role: roleState[0] }).then(
        function (bot) {
          busyState[1](false);
          props.onHired(bot);
        },
        function (err) {
          busyState[1](false);
          errorState[1](String(err && err.message ? err.message : err));
        }
      );
    }

    return h(
      "div",
      { className: "crew-scrim", onClick: props.onClose },
      h(
        "div",
        {
          className: "crew-modal",
          onClick: function (e) {
            e.stopPropagation();
          },
        },
        h("h3", null, "Hire a teammate"),
        h(
          "label",
          null,
          "Name",
          h("input", {
            value: nameState[0],
            autoFocus: true,
            placeholder: "Scout",
            onChange: function (e) {
              nameState[1](e.target.value);
            },
          })
        ),
        h(
          "label",
          null,
          "What they do, in one line",
          h("input", {
            value: roleState[0],
            placeholder: "Turns a one-line question into a decision-ready brief",
            onChange: function (e) {
              roleState[1](e.target.value);
            },
          })
        ),
        h(
          "div",
          { className: "crew-panel-note", style: { padding: 0 } },
          "This creates a Hermes profile with its own SOUL.md, memory, skills and computer. It accumulates the rest through use."
        ),
        errorState[0] ? h("div", { className: "crew-error" }, errorState[0]) : null,
        h(
          "div",
          { className: "crew-modal-actions" },
          h("button", { className: "crew-btn", onClick: props.onClose }, "Cancel"),
          h(
            "button",
            { className: "crew-btn primary", onClick: submit, disabled: busyState[0] },
            busyState[0] ? "Hiring…" : "Hire"
          )
        )
      )
    );
  }

  function Onboarding(props) {
    var busy = useState(false);
    return h(
      "div",
      { className: "crew-col" },
      h(
        "div",
        { className: "crew-empty" },
        h("h2", null, "Nobody works here yet"),
        h(
          "p",
          null,
          "A teammate is a Hermes profile with its own soul, memory, skills, routines and computer. Start with the shipped crew, or hire someone for exactly your problem."
        ),
        h(
          "ul",
          null,
          (props.status.seed_teammates || []).map(function (seed) {
            return h("li", { key: seed.id }, seed.emoji + " " + seed.id + " — " + seed.role);
          })
        ),
        !props.status.docker_available
          ? h(
              "p",
              { className: "crew-error" },
              "Docker is not reachable, so teammates will start without a computer — no shell, browser, or takeover login. Everything else works."
            )
          : null,
        h(
          "div",
          { style: { display: "flex", gap: "0.5rem" } },
          h(
            "button",
            {
              className: "crew-btn primary",
              disabled: busy[0],
              onClick: function () {
                busy[1](true);
                post("/seed", { create_profiles: true }).then(props.onSeeded, function (err) {
                  busy[1](false);
                  window.alert(String(err && err.message ? err.message : err));
                });
              },
            },
            busy[0] ? "Setting up…" : "Bring on the shipped crew"
          ),
          h("button", { className: "crew-btn", onClick: props.onHire }, "Hire someone else")
        )
      )
    );
  }

  // -------------------------------------------------------------------------
  // Page
  // -------------------------------------------------------------------------

  function CrewPage() {
    var conversationsState = useState([]);
    var sectionsState = useState([]);
    var statusState = useState(null);
    var selectedState = useState(null);
    var messagesState = useState([]);
    var statusesState = useState({});
    var panelState = useState(null);
    var hiringState = useState(false);
    var collapsedState = useState({});

    var conversations = conversationsState[0];
    var setConversations = conversationsState[1];
    var selected = selectedState[0];
    var setSelected = selectedState[1];
    var messages = messagesState[0];
    var setMessages = messagesState[1];

    var selectedRef = useRef(null);
    selectedRef.current = selected;

    var refresh = useCallback(function () {
      api("/conversations").then(function (data) {
        setConversations(data.conversations || []);
      });
      api("/sections").then(function (data) {
        sectionsState[1](data.sections || []);
      });
    }, []);

    useEffect(function () {
      api("/status").then(function (data) {
        statusState[1](data);
      });
      refresh();
    }, []);

    // Open the first thread once the roster arrives, so the page is never an
    // empty middle column next to a populated sidebar.
    useEffect(
      function () {
        if (!selected && conversations.length) setSelected(conversations[0].id);
      },
      [conversations.length]
    );

    useEffect(
      function () {
        if (!selected) return;
        api("/threads/" + encodeURIComponent(selected) + "/messages").then(function (data) {
          setMessages(data.messages || []);
        });
      },
      [selected]
    );

    // One socket for everything: new chips (tailed from crew.db, whichever
    // process wrote them) and teammate status.
    useEffect(function () {
      var socket = null;
      var closed = false;
      var retry = null;

      function connect() {
        SDK.buildWsUrl(API + "/events").then(function (url) {
          if (closed) return;
          socket = new WebSocket(url);
          socket.onmessage = function (event) {
            var payload;
            try {
              payload = JSON.parse(event.data);
            } catch (e) {
              return;
            }
            if (payload.type === "status") {
              statusesState[1](function (prev) {
                var next = Object.assign({}, prev);
                next[payload.bot_id] = payload.state;
                return next;
              });
              return;
            }
            if (payload.type !== "message") return;

            // Upsert by id, never append blindly: a resolved approval is
            // re-broadcast under its ORIGINAL id so the pending chip flips in
            // place instead of a second chip landing at the bottom.
            if (payload.thread_id === selectedRef.current) {
              setMessages(function (prev) {
                var index = prev.findIndex(function (m) {
                  return m.id === payload.message.id;
                });
                if (index === -1) return prev.concat([payload.message]);
                var next = prev.slice();
                next[index] = payload.message;
                return next;
              });
            }
            setConversations(function (prev) {
              return prev.map(function (c) {
                return c.id === payload.thread_id
                  ? Object.assign({}, c, { last_message: payload.message })
                  : c;
              });
            });
          };
          socket.onclose = function () {
            if (!closed) retry = setTimeout(connect, 1500);
          };
        });
      }

      connect();
      return function () {
        closed = true;
        if (retry) clearTimeout(retry);
        if (socket) socket.close();
      };
    }, []);

    var onSend = useCallback(
      function (text) {
        if (!selectedRef.current) return;
        post("/threads/" + encodeURIComponent(selectedRef.current) + "/messages", { text: text });
      },
      []
    );

    var onDecide = useCallback(function (approvalId, decision) {
      post("/approvals/" + approvalId, { decision: decision }).catch(function (err) {
        // 409 means somebody already decided it — the chip is about to flip
        // via the event stream, so this is information, not a failure.
        var text = String(err && err.message ? err.message : err);
        if (text.indexOf("409") === -1) window.alert(text);
      });
    }, []);

    function openScreen() {
      var id = selectedRef.current;
      if (!id || id.indexOf("dm:") !== 0) return;
      var botId = id.slice(3);
      panelState[1]({ bot_id: botId, running: false });
      api("/bots/" + encodeURIComponent(botId) + "/computer?start=true").then(function (info) {
        panelState[1](info);
      });
    }

    function nameOf(senderId) {
      var match = conversations.filter(function (c) {
        return c.id === "dm:" + senderId;
      })[0];
      return match ? match.title : senderId;
    }

    var status = statusState[0];
    var conversation = conversations.filter(function (c) {
      return c.id === selected;
    })[0];
    var panel = panelState[0];

    if (status && !status.ready) {
      return h(
        "div",
        { className: "crew" },
        h(Onboarding, {
          status: status,
          onHire: function () {
            hiringState[1](true);
          },
          onSeeded: function () {
            api("/status").then(function (data) {
              statusState[1](data);
            });
            refresh();
          },
        }),
        hiringState[0]
          ? h(HireModal, {
              onClose: function () {
                hiringState[1](false);
              },
              onHired: function () {
                hiringState[1](false);
                api("/status").then(function (data) {
                  statusState[1](data);
                });
                refresh();
              },
            })
          : null
      );
    }

    return h(
      "div",
      { className: "crew" + (panel ? " with-panel" : "") },
      h(Roster, {
        conversations: conversations,
        sections: sectionsState[0],
        collapsed: collapsedState[0],
        statuses: statusesState[0],
        selectedId: selected,
        onSelect: setSelected,
        onHire: function () {
          hiringState[1](true);
        },
        onToggleSection: function (id) {
          collapsedState[1](function (prev) {
            var next = Object.assign({}, prev);
            next[id] = !next[id];
            return next;
          });
        },
      }),
      conversation
        ? h(Thread, {
            threadId: selected,
            conversation: conversation,
            messages: messages,
            nameOf: nameOf,
            onSend: onSend,
            onOpenScreen: openScreen,
            handlers: { onDecide: onDecide, onOpenScreen: openScreen },
          })
        : h("div", { className: "crew-col" }, h("div", { className: "crew-empty" }, "Pick a thread.")),
      panel
        ? h(ComputerPanel, {
            info: panel,
            onClose: function () {
              panelState[1](null);
            },
            onStart: openScreen,
          })
        : null,
      hiringState[0]
        ? h(HireModal, {
            onClose: function () {
              hiringState[1](false);
            },
            onHired: function () {
              hiringState[1](false);
              refresh();
            },
          })
        : null
    );
  }

  window.__HERMES_PLUGINS__.register("hermes-crew", CrewPage);
})();
