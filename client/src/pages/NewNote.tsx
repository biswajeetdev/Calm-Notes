import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateNote, useGenerateNote } from "@/hooks/use-notes";
import { Loader2, Wand2, Save, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Schema for the form
const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  sessionDate: z.string(),
  sessionType: z.string().min(1, "Session type is required"),
  riskFlags: z.string().optional(),
  rawNotes: z.string().min(10, "Please enter at least a few words of notes"),
  format: z.enum(["SOAP", "DAP", "BIRP"]),
});

type FormData = z.infer<typeof formSchema>;

export default function NewNote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createNote = useCreateNote();
  const generateNote = useGenerateNote();
  
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sessionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      format: "SOAP",
      sessionType: "Individual Therapy",
      rawNotes: "",
      riskFlags: "",
    }
  });

  // Watch fields needed for generation
  const rawNotes = watch("rawNotes");
  const selectedFormat = watch("format");

  // Handle AI Generation
  const handleGenerate = async () => {
    if (!rawNotes || rawNotes.length < 10) {
      toast({ title: "Insufficient Content", description: "Please enter more notes to generate a structured output.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateNote.mutateAsync({
        rawNotes,
        format: selectedFormat,
        clientName: watch("clientName"),
        sessionType: watch("sessionType"),
        riskFlags: watch("riskFlags"),
      });
      setGeneratedContent(result.content);
      toast({ title: "Note Generated", description: "Review and edit the generated content below." });
    } catch (error) {
      console.error(error);
      // Toast handled in hook
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Save
  const onSave = async (data: FormData) => {
    if (!generatedContent) {
      toast({ title: "Generate First", description: "Please generate the note content before saving.", variant: "destructive" });
      return;
    }

    try {
      const result = await createNote.mutateAsync({
        clientName: data.clientName,
        sessionDate: new Date(data.sessionDate),
        sessionType: data.sessionType,
        riskFlags: data.riskFlags,
        rawNotes: data.rawNotes,
        selectedFormat: data.format,
        structuredOutput: { content: generatedContent },
      } as any);
      setLocation(`/notes/${result.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold">New Session Note</h1>
            <p className="text-muted-foreground">Record details and generate clinical documentation.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Column */}
          <div className="space-y-6">
            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>Enter basic information about the session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input 
                    id="clientName" 
                    {...register("clientName")} 
                    className={errors.clientName ? "border-destructive" : ""}
                    placeholder="e.g. John Doe" 
                  />
                  {errors.clientName && <p className="text-xs text-destructive">{errors.clientName.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionDate">Date & Time</Label>
                    <Input 
                      id="sessionDate" 
                      type="datetime-local" 
                      {...register("sessionDate")} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionType">Type</Label>
                    <Select onValueChange={(val) => setValue("sessionType", val)} defaultValue="Individual Therapy">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual Therapy">Individual Therapy</SelectItem>
                        <SelectItem value="Couples Therapy">Couples Therapy</SelectItem>
                        <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                        <SelectItem value="Group Therapy">Group Therapy</SelectItem>
                        <SelectItem value="Intake Assessment">Intake Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskFlags">Risk Flags (Optional)</Label>
                  <Input 
                    id="riskFlags" 
                    {...register("riskFlags")} 
                    placeholder="e.g. Suicidal ideation, self-harm" 
                    className="border-dashed focus:border-solid"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Raw Notes</CardTitle>
                  <CardDescription>Jot down your thoughts or paste transcript.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <Textarea 
                  {...register("rawNotes")}
                  className="min-h-[300px] text-base resize-none focus:ring-2 focus:ring-primary/20 border-border" 
                  placeholder="- Discussed anxiety regarding work&#10;- Client reports better sleep hygiene&#10;- Practiced grounding techniques&#10;- Plan: Continue CBT homework..."
                />
                {errors.rawNotes && <p className="text-xs text-destructive mt-2">{errors.rawNotes.message}</p>}
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-muted-foreground">Format:</Label>
                    <Select onValueChange={(val: any) => setValue("format", val)} defaultValue="SOAP">
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SOAP">SOAP</SelectItem>
                        <SelectItem value="DAP">DAP</SelectItem>
                        <SelectItem value="BIRP">BIRP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !rawNotes}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 transition-all hover:scale-105"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generate Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Output Column */}
          <div className="space-y-6">
             <Card className="h-full border-border/50 shadow-md flex flex-col bg-muted/30">
              <CardHeader>
                <CardTitle>Generated Documentation</CardTitle>
                <CardDescription>
                  {generatedContent ? "Review and edit before saving." : "Output will appear here."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {generatedContent ? (
                  <Textarea 
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    className="h-full min-h-[500px] font-mono text-sm leading-relaxed bg-white border-border focus:ring-primary/20"
                  />
                ) : (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-white/50">
                    <Sparkles className="w-12 h-12 mb-4 text-secondary-foreground/20" />
                    <p>Ready to generate</p>
                  </div>
                )}
              </CardContent>
              <div className="p-6 pt-0 border-t border-border/50 mt-auto flex justify-end gap-3 bg-white/50 rounded-b-xl">
                 {generatedContent && (
                   <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                     <RefreshCw className="w-4 h-4" /> Regenerate
                   </Button>
                 )}
                 <Button 
                   onClick={handleSubmit(onSave)} 
                   disabled={!generatedContent || createNote.isPending}
                   className="bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20 gap-2 w-full sm:w-auto"
                 >
                   {createNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                   Save to Records
                 </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
