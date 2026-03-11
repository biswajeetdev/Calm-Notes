import { Layout } from "@/components/Layout";
import { useNote, useUpdateNote, useDeleteNote } from "@/hooks/use-notes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, User, ArrowLeft, Trash2, Edit2, Check, X, Copy, Download } from "lucide-react";
import { useRoute, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function NoteDetail() {
  const [match, params] = useRoute("/notes/:id");
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: note, isLoading } = useNote(id);
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    if (note) {
      // Safely access content
      const content = (note.structuredOutput as any)?.content || "";
      setEditedContent(content);
    }
  }, [note]);

  if (isLoading) {
    return (
      <Layout>
         <div className="max-w-3xl mx-auto space-y-8 p-8">
           <Skeleton className="h-8 w-1/3" />
           <Skeleton className="h-64 w-full rounded-xl" />
         </div>
      </Layout>
    );
  }

  if (!note) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">Note not found</h2>
          <Link href="/"><Button>Return Dashboard</Button></Link>
        </div>
      </Layout>
    );
  }

  const handleSave = async () => {
    try {
      await updateNote.mutateAsync({
        id: note.id,
        structuredOutput: { ...note.structuredOutput as any, content: editedContent }
      });
      setIsEditing(false);
    } catch (error) {
      // handled by hook
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNote.mutateAsync(note.id);
      setLocation("/");
    } catch (error) {
      // handled by hook
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedContent);
    toast({ title: "Copied", description: "Note content copied to clipboard." });
  };

  const downloadPdf = () => {
    window.open(`/api/notes/${note.id}/export/pdf`, "_blank");
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
             <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
               <ArrowLeft className="w-4 h-4" /> Back to Dashboard
             </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadPdf} className="gap-2">
              <Download className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
              <Copy className="w-4 h-4" /> Copy
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the clinical record for {note.clientName}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-border/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
               <h1 className="text-3xl font-heading font-bold text-foreground mb-2">{note.clientName}</h1>
               <div className="flex items-center gap-4 text-sm text-muted-foreground">
                 <div className="flex items-center gap-1.5">
                   <Calendar className="w-4 h-4" />
                   {note.sessionDate && format(new Date(note.sessionDate), "MMMM d, yyyy")}
                 </div>
                 <div className="flex items-center gap-1.5">
                   <Clock className="w-4 h-4" />
                   {note.sessionDate && format(new Date(note.sessionDate), "h:mm a")}
                 </div>
                 <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                   {note.sessionType}
                 </Badge>
               </div>
             </div>
             {note.riskFlags && (
               <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl max-w-xs">
                 <p className="text-xs font-bold uppercase tracking-wider mb-1">Risk Flags</p>
                 <p className="text-sm font-medium">{note.riskFlags}</p>
               </div>
             )}
          </div>

          {/* Note Content */}
          <Card className="shadow-md border-border/50 overflow-hidden">
             <div className="bg-secondary/30 border-b border-border/50 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <span className="font-mono text-sm font-bold bg-white border border-border px-2 py-0.5 rounded">
                     {note.selectedFormat}
                   </span>
                   <span className="text-sm text-muted-foreground font-medium">Clinical Documentation</span>
                </div>
                {!isEditing ? (
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="gap-2 h-8">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 w-8 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateNote.isPending} className="h-8 gap-2 bg-primary">
                      <Check className="w-3.5 h-3.5" /> Save
                    </Button>
                  </div>
                )}
             </div>
             
             <div className="p-0">
               {isEditing ? (
                 <Textarea 
                   value={editedContent}
                   onChange={(e) => setEditedContent(e.target.value)}
                   className="w-full min-h-[500px] border-none focus:ring-0 resize-none p-6 font-mono text-sm leading-relaxed"
                 />
               ) : (
                 <div className="whitespace-pre-wrap p-6 font-mono text-sm leading-relaxed text-foreground/90">
                   {editedContent || "No content generated."}
                 </div>
               )}
             </div>
          </Card>
          
          {/* Metadata Footer */}
          <div className="text-xs text-muted-foreground text-center pt-8 pb-4">
             Note ID: {note.id}
             {note.createdAt && ` • Created: ${format(new Date(note.createdAt), "PPP")}`}
             {note.updatedAt && ` • Last Updated: ${format(new Date(note.updatedAt), "PPP")}`}
          </div>
        </div>
      </div>
    </Layout>
  );
}
